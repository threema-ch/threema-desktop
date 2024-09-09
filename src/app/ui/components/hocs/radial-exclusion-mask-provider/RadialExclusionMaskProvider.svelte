<!--
  @component Renders the given content wrapped in a container which the given radial cutouts are
  excluded from, similar to Emmentaler cheese.
-->
<script lang="ts">
  import type {RadialExclusionMaskProviderProps} from '~/app/ui/components/hocs/radial-exclusion-mask-provider/props';
  import type {u53} from '~/common/types';

  type $$Props = RadialExclusionMaskProviderProps;

  export let cutouts: $$Props['cutouts'];

  /**
   * Get the CSS style of a single cutout, expressed as a `radial-gradient`.
   */
  function getRadialGradientStyle({
    diameter,
    position: {x, y},
  }: (typeof cutouts)[u53]): `radial-gradient(${string})` {
    const radius = diameter / 2;

    /* Add a small gap of 1% between the cutout and the opaque area for smooth edges. */
    return `radial-gradient(circle ${radius}px at ${x}% ${y}%, transparent ${radius}px, black ${radius + 1}px, black 100%)`;
  }

  /**
   * Get the CSS style of an exclusion mask consiting of multiple cutouts, expressed as a
   * `mask-image` and `mask-composite`. Returns `undefined` if the given array of cutouts is empty.
   */
  function getExclusionMaskStyle(currentCutouts: typeof cutouts): {
    maskComposite?: string;
    maskImage?: string;
  } {
    if (currentCutouts.length === 0) {
      return {
        maskComposite: undefined,
        maskImage: undefined,
      };
    }

    const gradientStyles = currentCutouts.map((cutout) => getRadialGradientStyle(cutout));

    if (currentCutouts.length === 1 && gradientStyles[0] !== undefined) {
      // Return mask style with a single cutout.
      return {
        maskComposite: 'exclude',
        maskImage: gradientStyles[0],
      };
    }

    const fillStyles = currentCutouts.map(() => 'black');

    // Return mask style with multiple cutouts.
    return {
      maskComposite: 'exclude',
      maskImage: `${gradientStyles.join(', ')}, linear-gradient(${fillStyles.join(', ')})`,
    };
  }

  $: exclusionMaskStyle = getExclusionMaskStyle(cutouts);
</script>

<div
  class="container"
  style:mask-image={exclusionMaskStyle.maskImage}
  style:mask-composite={exclusionMaskStyle.maskComposite}
>
  <slot />
</div>
