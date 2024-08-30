<!--
  @component Renders the Threema logo.
-->
<script lang="ts">
  import type {LogoProps} from '~/app/ui/components/partials/logo/props';
  import {clamp} from '~/common/utils/number';

  type $$Props = LogoProps;

  export let animated: NonNullable<$$Props['animated']> = false;
  export let onCompletion: $$Props['onCompletion'] = undefined;
  export let progress: $$Props['progress'] = undefined;

  let animationEndCount = 0;

  function handleAnimationEnd(event: AnimationEvent): void {
    animationEndCount += 1;

    // Because the observed element has two animations, fire callback only when the second one is
    // complete as well.
    if (animationEndCount >= 2) {
      animationEndCount = 0;
      onCompletion?.();
    }
  }
</script>

<span class="logo">
  <svg
    class="content"
    class:animated
    data-progress={progress ?? 'undefined'}
    viewBox="0 0 96 121"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
  >
    <defs>
      <mask id="threema-logo-lock-cutout-mask">
        <rect width="100%" height="100%" fill="white" />

        <!-- Lock shape -->
        <path
          d="M47.9931739,19 C55.8279971,19 62.1664874,25.2939683 62.1668469,33.0423938 L62.1668469,38.6597795 L62.7233464,38.6597795 C63.9807691,38.6597795 65,39.671622 65,40.9199296 L65,60.739849 C65,61.9881575 63.9807691,63 62.7233464,63 L33.2766545,63 C32.0192309,63 31,61.9881575 31,60.739849 L31,40.9199296 C31,39.671622 32.0192309,38.6597795 33.2766545,38.6597795 L33.8331539,38.6597795 L33.8331539,33.0427504 C33.8331539,25.2943249 40.1712847,19 47.9931739,19 Z M47.9956891,24.617029 C43.3026271,24.617029 39.4994609,28.3944089 39.4994609,33.0434637 L39.4994609,38.6594229 L56.4998208,38.6594229 L56.4998208,33.0434637 C56.4998208,28.3944089 52.6966546,24.617029 47.9956891,24.617029 Z"
          fill="black"
        />
      </mask>

      <mask id="threema-logo-checkmark-cutout-mask">
        <rect width="100%" height="100%" fill="white" />

        <!-- Checkmark shape -->
        <path
          d="M70.182339,24.5386387 L72.3649549,26.5779736 C73.1720455,27.3320814 73.2149964,28.5976828 72.4608885,29.4047733 C72.4570419,29.4088902 72.4531779,29.4129908 72.4492965,29.4170751 L42.2458992,61.1997653 L42.2458992,61.1997653 L41.1250625,62.379209 C40.3641605,63.1798975 39.0982414,63.2121508 38.2975529,62.4512488 C38.2651663,62.4204716 38.2338202,62.3886177 38.2035671,62.3557408 L37.1021684,61.1588191 L37.1021684,61.1588191 L23.5282901,46.4076938 C22.7803493,45.5948849 22.8329352,44.3296473 23.6457441,43.5817065 C23.6498801,43.5779005 23.6540322,43.574112 23.6582001,43.5703411 L25.8739672,41.565643 C26.688165,40.8290038 27.9439868,40.8864925 28.687477,41.6944391 L39.7345296,53.6992079 L39.7345296,53.6992079 L67.3671439,24.6222572 C68.123505,23.8263617 69.3800727,23.7890384 70.182339,24.5386387 Z"
          fill="black"
        />
      </mask>

      <filter id="threema-logo-morph-blur-filter">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
        <feColorMatrix
          in="blur"
          mode="matrix"
          values="1  0  0   0   0
                  0  1  0   0   0
                  0  0  1   0   0
                  0  0  0  20 -10"
          result="threema-logo-morph-blur-filter"
        />
        <feComposite in="SourceGraphic" in2="threema-logo-morph-blur-filter" operator="atop" />
      </filter>
    </defs>

    <g transform="translate(0, 5)">
      <!-- Bubble shape -->
      <path
        class="bubble"
        d="M48,0 C74.5098128,0 96,18.8608694 96,42.126891 C96,65.3929126 74.5098128,84.2537828 48,84.2537828 C40.4553672,84.2537828 33.31718,82.7259288 26.9649496,80.0039645 L2.91764,86 L8.056748,65.4969283 C2.9673672,58.8092946 0,50.7722168 0,42.126891 C0,18.8608694 21.4901872,0 48,0 Z M48,10 C30.8791728,10 17,23.8791728 17,41 C17,58.1208272 30.8791728,72 48,72 C65.1208272,72 79,58.1208272 79,41 C79,23.8791728 65.1208272,10 48,10 Z"
        fill="currentColor"
        fill-rule="nonzero"
      />

      <!-- Icon containers -->
      <circle
        class="lock"
        fill="currentColor"
        cx="48"
        cy="41"
        r="38"
        mask="url(#threema-logo-lock-cutout-mask)"
      />
      <circle
        class="checkmark"
        fill="currentColor"
        cx="48"
        cy="41"
        r="38"
        mask="url(#threema-logo-checkmark-cutout-mask)"
        on:animationend={handleAnimationEnd}
      />

      <!-- Progress bar track -->
      <rect
        class="progress-bar-track"
        x="12"
        y="91"
        width="72"
        height="16"
        rx="11"
        fill="rgba(0, 0, 0, 0.35)"
      />

      <g fill="currentColor" filter="url(#threema-logo-morph-blur-filter)">
        <!-- Sizing helper -->
        <rect x="0" y="0" width="96" height="111" fill="transparent" />

        <!-- Progress bar -->
        <rect
          class="progress-bar"
          x="10"
          y="91"
          width={clamp(76 * (progress === 'unknown' ? 0 : (progress ?? 1)), {min: 24})}
          height="16"
          rx="0"
        />

        <!-- Dots -->
        <g class="dots">
          <circle class="dot" cx="19" cy="99" r="10" />
          <circle class="dot" cx="48" cy="99" r="10" />
          <circle class="dot" cx="77" cy="99" r="10" />
        </g>
      </g>
    </g>
  </svg>
</span>

<style lang="scss">
  @use 'component' as *;

  .logo {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;

    width: 100%;
    height: 100%;

    .content {
      position: relative;
      display: inline-block;

      width: 100%;
      height: auto;

      .lock {
        opacity: 1;
      }

      .checkmark {
        opacity: 0;
      }

      .progress-bar-track {
        opacity: 1;
      }

      .progress-bar {
        opacity: 1;

        fill: var(--cc-logo-progress-bar-fill-color);
      }

      .dots {
        opacity: 0;
      }

      &[data-progress='1'].animated {
        .bubble {
          // Play jump animation once.
          animation: jump 0.45s ease-out 0.8s 1 normal forwards;
        }

        .lock {
          // Hide lock icon.
          transform-origin: 48px 41px;
          animation:
            jump 0.5s ease-out 0.9s 1 normal forwards,
            spin-out 0.3s ease-in 1.65s 1 normal forwards;
        }

        .checkmark {
          // Reveal checkmark icon.
          transform-origin: 48px 41px;
          animation:
            jump 0.5s ease-out 0.9s 1 normal forwards,
            spin-in 0.3s ease-out 1.65s 1 normal forwards;
        }

        .progress-bar-track {
          opacity: 0;
        }

        .progress-bar {
          // Hide progress bar.
          transform-origin: center bottom;
          animation: reveal 0.5s ease-out 0.25s 1 reverse forwards;
        }

        .dots {
          // Reveal dots.
          transform-origin: center bottom;
          animation: reveal 0.5s ease-out 0.25s 1 normal forwards;

          fill: var(--cc-logo-progress-bar-fill-color);

          .dot {
            // Play bounce animation once.
            animation: bounce 1.25s linear 1 normal forwards;

            &:nth-child(1) {
              transform-origin: 20% bottom;
              animation-delay: 0.3s;
            }

            &:nth-child(2) {
              transform-origin: center bottom;
              animation-delay: 0.4s;
            }

            &:nth-child(3) {
              transform-origin: 80% bottom;
              animation-delay: 0.5s;
            }
          }
        }
      }

      &[data-progress='unknown'].animated {
        .progress-bar-track {
          opacity: 0;
        }

        .progress-bar {
          opacity: 0;
        }

        .dots {
          opacity: 1;
          fill: var(--cc-logo-progress-bar-fill-color);

          .dot {
            // Play bounce animation once.
            animation: bounce 1.25s linear infinite normal forwards;

            &:nth-child(1) {
              transform-origin: 20% bottom;
              animation-delay: 0s;
            }

            &:nth-child(2) {
              transform-origin: center bottom;
              animation-delay: 0.1s;
            }

            &:nth-child(3) {
              transform-origin: 80% bottom;
              animation-delay: 0.2s;
            }
          }
        }
      }

      &[data-progress='undefined'] {
        .lock {
          opacity: 1;
        }

        .checkmark {
          opacity: 0;
        }

        .progress-bar-track {
          opacity: 0;
        }

        .progress-bar {
          opacity: 0;
        }

        .dots {
          opacity: 1;
        }
      }
    }
  }

  @keyframes reveal {
    0% {
      opacity: 0;
      transform: scale(0.75, 0.75);
    }
    100% {
      opacity: 1;
      transform: scale(1, 1);
    }
  }

  @keyframes spin-in {
    0%,
    40% {
      opacity: 0;
      transform: rotate(45deg);
    }
    50% {
      opacity: 1;
    }
    80% {
      transform: rotate(-25deg);
    }
    100% {
      opacity: 1;
      transform: rotate(0deg);
    }
  }

  @keyframes spin-out {
    0% {
      opacity: 1;
      transform: rotate(0deg);
    }
    45% {
      opacity: 1;
    }
    50%,
    100% {
      opacity: 0;
      transform: rotate(-60deg);
    }
  }

  @keyframes jump {
    0% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-5px);
    }
    100% {
      transform: translateY(0);
    }
  }

  @keyframes bounce {
    0% {
      transform: scale(1, 1) translateY(0);
    }
    10% {
      transform: scale(1, 1) translateY(0);
    }
    30% {
      transform: scale(1.175, 0.75) translateY(0);
    }
    35% {
      transform: scale(0.8, 1.2) translateY(0);
    }
    48% {
      transform: scale(1.125, 0.8) translateY(-15px);
    }
    50% {
      transform: scale(1.125, 0.8) translateY(-16px);
    }
    65% {
      transform: scale(1.125, 0.8) translateY(0);
    }
    70%,
    100% {
      transform: scale(1, 1) translateY(0);
    }
  }
</style>
