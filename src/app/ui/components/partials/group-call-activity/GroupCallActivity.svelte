<!--
  @component Renders the group call activity sidebar.
-->
<script lang="ts">
  import ControlBar from '~/app/ui/components/partials/group-call-activity/internal/control-bar/ControlBar.svelte';
  import TopBar from '~/app/ui/components/partials/group-call-activity/internal/top-bar/TopBar.svelte';
  import type {GroupCallActivityProps} from '~/app/ui/components/partials/group-call-activity/props';
  import ProfilePicture from '~/app/ui/components/partials/profile-picture/ProfilePicture.svelte';
  import VideoFeed from '~/app/ui/components/partials/video-feed/VideoFeed.svelte';
  import type {VideoFeedProps} from '~/app/ui/components/partials/video-feed/props';
  import type {DbContactUid} from '~/common/db';
  import {ReceiverType} from '~/common/enum';
  import {unusedProp} from '~/common/utils/svelte-helpers';

  type $$Props = GroupCallActivityProps;

  export let isExpanded: $$Props['isExpanded'];
  export let services: $$Props['services'];

  unusedProp(services);

  // TODO(DESK-1447): Implement real feed data and ViewModel.
  const demoFeeds: Omit<VideoFeedProps, 'services'>[] = [
    {
      isAudioEnabled: true,
      isVideoEnabled: true,
      receiver: {
        color: 'amber',
        initials: 'AB',
        lookup: {
          type: ReceiverType.CONTACT,
          uid: 1n as DbContactUid,
        },
        name: 'Caller 1',
        type: 'contact',
      },
    },
    {
      isAudioEnabled: false,
      isVideoEnabled: true,
      receiver: {
        color: 'blue',
        initials: 'CD',
        lookup: {
          type: ReceiverType.CONTACT,
          uid: 2n as DbContactUid,
        },
        name: 'Caller 2',
        type: 'contact',
      },
    },
    {
      isAudioEnabled: false,
      isVideoEnabled: false,
      receiver: {
        color: 'blue',
        initials: 'EF',
        lookup: {
          type: ReceiverType.CONTACT,
          uid: 321n as DbContactUid,
        },
        name: 'Caller 3',
        type: 'contact',
      },
    },
    {
      isAudioEnabled: false,
      isVideoEnabled: false,
      receiver: {
        color: 'green',
        initials: 'GH',
        lookup: {
          type: ReceiverType.CONTACT,
          uid: 4n as DbContactUid,
        },
        name: 'Caller 4',
        type: 'contact',
      },
    },
  ];

  function handleClickLeaveCall(): void {
    // TODO(DESK-1447): Trigger leaving the call in the back-end.
    // viewModelController?.leaveCall();
  }

  function handleClickToggleAudio(): void {
    // TODO(DESK-1447): Trigger toggling of outgoing audio in the back-end.
    // viewModelController?.toggleAudio();
  }

  function handleClickToggleVideo(): void {
    // TODO(DESK-1447): Trigger toggling of outgoing video in the back-end.
    // viewModelController?.toggleVideo();
  }
</script>

<div class="container" class:expanded={isExpanded}>
  <div class="top-bar">
    <!-- TODO(DESK-1447): Pass in real data from ViewModel. -->
    <TopBar
      {isExpanded}
      memberCount={demoFeeds.length}
      startedAt={new Date('2024-05-08T12:45:16.677Z')}
      on:clicktoggleexpand
    />
  </div>

  <div class="content">
    <div class="feeds">
      <!-- TODO(DESK-1447): Pass in real data from ViewModel. -->
      {#each demoFeeds as feed}
        <VideoFeed {...feed} {services} />
      {/each}
    </div>

    <div class="profile-pictures">
      <!-- TODO(DESK-1447): Pass in real data from ViewModel. -->
      {#each demoFeeds as profilePicture}
        <ProfilePicture
          extraCharms={[
            {
              content: {
                type: 'icon',
                icon: profilePicture.isAudioEnabled ? 'mic' : 'mic_off',
                family: 'material',
              },
              position: 135,
              style: {
                type: 'cutout',
                contentColor: 'white',
                gap: 2,
                backgroundColor: profilePicture.isAudioEnabled
                  ? 'var(--t-color-primary-600)'
                  : 'red',
              },
            },
          ]}
          options={{
            hideDefaultCharms: true,
            isClickable: false,
          }}
          receiver={profilePicture.receiver}
          {services}
          size="md"
        />
      {/each}
    </div>

    <div class="footer">
      <ControlBar
        isAudioEnabled={true}
        isVideoEnabled={true}
        on:clickleavecall={handleClickLeaveCall}
        on:clicktoggleaudio={handleClickToggleAudio}
        on:clicktogglevideo={handleClickToggleVideo}
      />
    </div>
  </div>
</div>

<style lang="scss">
  @use 'component' as *;

  .container {
    display: grid;
    overflow: hidden;
    grid-template:
      'top-bar' rem(64px)
      'content' 1fr
      / 100%;

    .top-bar {
      grid-area: top-bar;

      border-bottom: 1px solid var(--t-panel-gap-color);
      padding: rem(12px) rem(16px) rem(16px) rem(16px);
    }

    .content {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: space-between;

      position: relative;
      overflow-y: auto;

      .feeds {
        display: none;
      }

      .profile-pictures {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: start;
        gap: rem(12px);

        padding: rem(16px) 0;
      }

      .footer {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;

        position: sticky;
        left: 0;
        right: 0;
        bottom: 0;

        padding: 0 rem(12px) rem(12px) rem(12px);

        &::after {
          content: '';

          position: fixed;
          z-index: -1;
          background: linear-gradient(to top, var(--t-aside-background-color), transparent);
          left: 0;
          right: 0;
          bottom: 0;
          height: rem(104px);
        }
      }
    }

    &.expanded {
      background-color: rgb(38, 38, 38);

      .top-bar {
        border-bottom: 1px solid transparent;
      }

      .content .footer::after {
        background: none;
      }
    }
  }

  @container activity (min-width: 256px) {
    .container {
      .top-bar {
        padding: rem(12px) rem(12px) rem(16px) rem(16px);
      }

      .content {
        .feeds {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          grid-auto-rows: min-content;
          gap: rem(8px);

          padding: rem(16px);
        }

        .profile-pictures {
          display: none;
        }

        .footer {
          padding: rem(12px);
        }
      }
    }
  }

  @container activity (min-width: 512px) {
    .container > .content > .feeds {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @container activity (min-width: 768px) {
    .container > .content > .feeds {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @container activity (min-width: 1024px) {
    .container > .content > .feeds {
      grid-template-columns: repeat(4, 1fr);
    }
  }
</style>
