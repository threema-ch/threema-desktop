"""
Convert screenshot data into a format that can be consumed directly by Desktop.
"""
from base64 import b64encode
import json
from os import path
import sys


def print_usage():
    print(f'Usage: {sys.argv[0]} <path-to-screenshots-dir>')


def convert_contacts(contacts, current_dir):
    converted = []
    for identity, data in contacts.items():
        # Basic data
        contact = {
            'identity': identity,
            'publicKey': data['pk'],
            'name': {
                'first': data['name']['default'][0],
                'last': data['name']['default'][1],
            },
            'verificationLevel': data.get('verification', 1) - 1, # Note: Desktop uses 0-2, not 1-3
            'acquaintanceLevel': 'GROUP' if data.get('hidden', False) else 'DIRECT',
            'identityType': 'WORK' if data.get('isWork', False) else 'REGULAR',
            'conversation': [],
        }
        assert len(contact['publicKey']) == 64

        # Inline avatar
        if 'avatar' in data:
            with open(path.join(current_dir, data['avatar']['default']), 'rb') as avatar:
                contact['avatar'] = b64encode(avatar.read()).decode('ascii')

        # Conversation messages
        for message in data.get('conversation', []):
            converted_message = {
                'secondsAgo': -message['date'],
                'type': message['type'],
                'direction': 'OUTGOING' if message['out'] else 'INCOMING',
            }

            if 'state' in message:
                if message['state'] == 'USERACK':
                    converted_message['lastReaction'] = 'ACKNOWLEDGE'
                elif message['state'] == 'USERDEC':
                    converted_message['lastReaction'] = 'DECLINE'
                else:
                    raise RuntimeError('Unsupported message state: ' + message['state'])

            if converted_message['type'] == 'IMAGE':
                assert message['content']['default'].endswith('.jpg')
                media_type = 'image/jpeg'
                with open(path.join(current_dir, message['content']['default']), 'rb') as image:
                    converted_message['content'] = {
                        'imageBytes': b64encode(image.read()).decode('ascii'),
                        'mediaType': media_type,
                    }
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

            if converted_message['direction'] == 'INCOMING':
                converted_message['isRead'] = message.get('read', True)

            contact['conversation'].append(converted_message)

        converted.append(contact)
    return converted


def convert_groups(groups, current_dir):
    converted = []

    return converted


def convert(variant, screenshots_dir, root_dir):
    # Read JSON
    work_data_dir = path.join(screenshots_dir, 'chat_data', variant)
    with open(path.join(work_data_dir, 'data.json')) as f:
        chat_data = json.loads(f.read())

    # Prepare output JSON
    contacts = convert_contacts(chat_data['contacts'], work_data_dir)
    groups = convert_groups(chat_data['groups'], work_data_dir)
    out = {
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

    convert('work', screenshots_dir, root_dir)
    convert('consumer', screenshots_dir, root_dir)
    print('Done!')


if __name__ == '__main__':
    main()
