"""
Convert screenshot data into a format that can be consumed directly by Desktop.
"""
from base64 import b64encode
import json
from os import path
import sys


OWN_IDENTITY_TOKEN = 'OWN_IDENTITY'


def print_usage():
    print(f'Usage: {sys.argv[0]} <path-to-screenshots-dir>')


def convert_conversation_messages(messages, current_dir, conversation_type, own_identity, senderIdentity):
    converted = []

    for message in messages:
        converted_message = {
            'minutesAgo': -message['date'],
            'type': message['type'],
            'direction': 'OUTGOING' if message['out'] else 'INCOMING',
        }

        if message.get('messageId') != None:
            converted_message['messageId'] = message['messageId']

        if conversation_type == 'group' and converted_message['direction'] == 'INCOMING':
            converted_message['identity'] = message['identity']

        if 'state' in message:
            converted_message['reactions'] = [dict()]
            if message['state'] == 'USERACK':

                converted_message['reactions'][0]['reaction'] = 'ACKNOWLEDGE'
            elif message['state'] == 'USERDEC':
                converted_message['reactions'][0]['reaction'] = 'DECLINE'
            else:
                raise RuntimeError('Unsupported message state: ' + message['state'])
            converted_message['reactions'][0]['senderIdentity'] = senderIdentity
        if converted_message['type'] == 'IMAGE':
            assert message['content']['default'].endswith('.jpg')
            media_type = 'image/jpeg'
            with open(path.join(current_dir, message['content']['default']), 'rb') as image:
                converted_message['content'] = {
                    'imageBytes': b64encode(image.read()).decode('ascii'),
                    'mediaType': media_type,
                }
                if 'caption' in message:
                    converted_message['content']['caption'] = message['caption']
        elif converted_message['type'] == 'FILE':
            with open(path.join(current_dir, message['content']['default']), 'rb') as file:
                converted_message['content'] = {
                    'fileName': message['content']['default'],
                    'fileBytes': b64encode(file.read()).decode('ascii'),
                    'mediaType': message['mime-type'],
                }
        elif converted_message['type'] == 'AUDIO':
            with open(path.join(current_dir, message['content']['default']), 'rb') as audio:
                converted_message['content'] = {
                    'audioBytes': b64encode(audio.read()).decode('ascii'),
                }
        elif converted_message['type'] == 'LOCATION':
            converted_message['content'] = {
                'lat': message['content']['default'][0],
                'lon': message['content']['default'][1],
                'description': message['content']['default'][3],
            }
        elif 'content' in message:
            converted_message['content'] = message['content']
            if 'contentQuoteV2' in message:
                converted_message['contentQuoteV2'] = message['contentQuoteV2']

        if converted_message['direction'] == 'INCOMING':
            converted_message['isRead'] = message.get('read', True)

        converted.append(converted_message)

    return converted


def convert_contacts(contacts, current_dir, own_identity):
    converted = []
    for identity, data in contacts.items():
        # Basic data
        contact = {
            'identity': identity,
            'publicKey': data['pk'],
            'name': {
                language: {'first': first, 'last': last}
                for language, [first, last]
                in data['name'].items()
            },
            'verificationLevel': data.get('verification', 1) - 1, # Note: Desktop uses 0-2, not 1-3
            'acquaintanceLevel': 'GROUP' if data.get('hidden', False) else 'DIRECT',
            'identityType': 'WORK' if data.get('isWork', False) else 'REGULAR',
        }
        assert len(contact['publicKey']) == 64

        # Inline avatar
        if 'avatar' in data:
            with open(path.join(current_dir, data['avatar']['default']), 'rb') as avatar:
                contact['avatar'] = b64encode(avatar.read()).decode('ascii')

        # Conversation messages
        contact['conversation'] = convert_conversation_messages(data.get('conversation', []), current_dir, 'contact', own_identity, identity)

        converted.append(contact)
    return converted


def convert_groups(groups, current_dir, contact_list_identities, own_identity):
    converted = []
    for data in groups:
        # Validate members
        for member in data['members']:
            if member not in contact_list_identities and member != own_identity:
                raise RuntimeError(
                    f'Group "{data["name"]["default"]}" contains member {member} who is not in the contact list'
                )
        if data['creator'] not in contact_list_identities and data['creator'] != own_identity:
            raise RuntimeError(
                f'Group "{data["name"]["default"]}" has creator {data["creator"]} who is not in the contact list'
            )

        # Basic data
        group = {
            'id': data['id'],
            'creator': OWN_IDENTITY_TOKEN if data['creator'] in [own_identity, '$'] else data['creator'],
            'name': data['name'],
            'members': [OWN_IDENTITY_TOKEN if id in [own_identity, '$'] else id for id in data['members']],
            'createdMinutesAgo': -data['created_at'],
        }

        # Inline avatar
        if 'avatar' in data:
            with open(path.join(current_dir, data['avatar']['default']), 'rb') as avatar:
                group['avatar'] = b64encode(avatar.read()).decode('ascii')

        # Conversation messages
        group['conversation'] = convert_conversation_messages(data.get('conversation', []), current_dir, 'group', own_identity, own_identity)

        converted.append(group)
    return converted


def convert(variant, screenshots_dir, root_dir):
    # Read JSON
    data_dir = path.join(screenshots_dir, 'chat_data', variant)
    with open(path.join(data_dir, 'data.json')) as f:
        chat_data = json.loads(f.read())

    # Determine own identity
    own_identity = chat_data['myIdentity']
    with open(path.join(data_dir, 'me.jpg'), 'rb') as f:
        own_profile_picture = b64encode(f.read()).decode('ascii')

    # Prepare output JSON
    contacts = convert_contacts(chat_data['contacts'], data_dir, own_identity)
    contact_list_identities = [c['identity'] for c in contacts]
    groups = convert_groups(chat_data['groups'], data_dir, contact_list_identities, own_identity)
    out = {
        'profile': {
            'identity': own_identity,
            'nickname': chat_data['nickname'],
            'profilePicture': own_profile_picture,
        },
        'contacts': contacts,
        'groups': groups,
    }

    # Write converted JSON
    with open(path.join(root_dir, 'src', 'common', 'dom', 'debug', f'screenshot-data-{variant}.json'), 'w') as f:
        print(f'Writing {variant} data')
        f.write(json.dumps(out, indent = 2))
        f.write('\n')


def main():
    # Parse args
    if len(sys.argv) < 2:
        print_usage()
        exit(1)
    screenshots_dir = sys.argv[1]
    root_dir = path.join(path.dirname(path.realpath(__file__)), '..')
    print(root_dir)
    convert('work', screenshots_dir, root_dir)
    convert('consumer', screenshots_dir, root_dir)
    print('Done!')


if __name__ == '__main__':
    main()
