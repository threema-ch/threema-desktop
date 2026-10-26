<!--
  @component Renders the Threema logo.
-->
<script lang="ts">
  import {clamp} from '@threema/ts-utils/integer/clamp';
  import type {u53} from '@threema/ts-utils/integer/u53';

  import type {LogoProps} from '~/app/ui/components/partials/logo/props';

  const {animated = false, oncompletion, progress}: LogoProps = $props();

  let animationEndCount = $state<u53>(0);

  function handleAnimationEnd(event: AnimationEvent): void {
    animationEndCount += 1;

    // Because the observed element has two animations, fire callback only when the second one is
    // complete as well.
    if (animationEndCount >= 2) {
      animationEndCount = 0;
      oncompletion?.();
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
          d="M61.0494502,41.3490265 L60.6543811,41.3490265 L60.6543811,35.5095479 C60.6543811,28.6195093 54.9754039,23 48.0123105,23 C41.0493587,23 35.3703815,28.6195093 35.3703815,35.5095479 L35.3703815,41.3490265 L34.9753123,41.3490265 C32.7778111,41.3490265 31,43.1082211 31,45.282711 L31,61.0663155 C31,63.2409455 32.7778111,65 34.9753123,65 L61.0246877,65 C63.2223304,65 65,63.2409455 65,61.0663155 L65,45.282711 C65,43.1082211 63.2223304,41.3490265 61.0246877,41.3490265 L61.0494502,41.3490265 Z M40.5802848,35.5095479 C40.5802848,31.4292639 43.9382309,28.1308441 48.0370731,28.1308441 C52.1357738,28.1308441 55.4938614,31.4537672 55.4938614,35.5095479 L55.4938614,41.3490265 L40.5802848,41.3490265 L40.5802848,35.5095479 Z"
          fill="black"
        />
      </mask>

      <mask id="threema-logo-checkmark-cutout-mask">
        <rect width="100%" height="100%" fill="white" />

        <!-- Checkmark shape -->
        <path
          d="M68.3518164,31.5109969 L70.4034947,33.4456772 C71.162167,34.1610856 71.2025412,35.3617389 70.4936731,36.1274111 C70.4900573,36.1313167 70.4864251,36.1352069 70.4827765,36.1390816 L42.0913156,66.2907474 L42.0913156,66.2907474 L41.0377192,67.4096644 C40.3224646,68.1692632 39.1324894,68.1998613 38.3798352,67.4780073 C38.3493915,67.4488095 38.3199258,67.4185903 38.2914877,67.3874005 L37.2561631,66.2519025 L37.2561631,66.2519025 L24.4965974,52.2577756 C23.7935264,51.4866784 23.8429576,50.2863703 24.6070052,49.5768123 C24.610893,49.5732016 24.614796,49.5696076 24.6187139,49.5660302 L26.7015546,47.6642092 C27.4669077,46.9653728 28.6473913,47.0199113 29.3462787,47.7863957 L39.730606,59.1751037 L39.730606,59.1751037 L65.7055081,31.5903242 C66.4164942,30.8352725 67.597679,30.7998646 68.3518164,31.5109969 Z"
          fill="black"
        />
      </mask>

      <filter id="threema-logo-morph-blur-filter">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
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

    <g transform="translate(0, 2)">
      <!-- Do not show the logo in custom builds -->
      {#if import.meta.env.BUILD_VARIANT !== 'custom'}
        <!-- Bubble shape -->
        <path
          class="bubble"
          d="M47.9876013,3 C72.243909,3 92,22.7369653 92,47.0000709 C92,71.2631765 72.2685646,91 48.012257,91 C39.0614184,91 30.753468,88.3289351 23.805544,83.7285238 L6.89292552,89.1450663 L12.382059,72.7965052 C7.11539285,65.5498332 4,56.6211487 4,47.0000709 C4,22.7369653 23.7312937,3 47.9876013,3 Z M48,18 C31.9837423,18 19,30.9837423 19,47 C19,63.0162577 31.9837423,76 48,76 C64.0162577,76 77,63.0162577 77,47 C77,30.9837423 64.0162577,18 48,18 Z"
          fill="currentColor"
          fill-rule="nonzero"
        />

        <!-- Icon containers -->
        <circle
          class="lock"
          fill="currentColor"
          cx="48"
          cy="47"
          r="38"
          mask="url(#threema-logo-lock-cutout-mask)"
        />
      {/if}

      <circle
        class="checkmark"
        fill="currentColor"
        cx="48"
        cy="47"
        r="38"
        mask="url(#threema-logo-checkmark-cutout-mask)"
        onanimationend={handleAnimationEnd}
      />

      <!-- Progress bar track -->
      <rect
        class="progress-bar-track"
        x="20"
        y="100"
        width="56"
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
          x="18"
          y="100"
          width={clamp(60 * (progress === 'unknown' ? 0 : (progress ?? 1)), {min: 24})}
          height="16"
          rx="8"
        />

        <!-- Dots -->
        <g class="dots">
          <circle class="dot" cx="26" cy="108" r="8" />
          <circle class="dot" cx="48" cy="108" r="8" />
          <circle class="dot" cx="70" cy="108" r="8" />
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
