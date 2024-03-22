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
  function getExclusionMaskStyle(
    currentCutouts: typeof cutouts,
  ): `mask-image: ${string}; mask-composite: exclude;` | undefined {
    if (currentCutouts.length === 0) {
      return undefined;
    }

    const gradientStyles = currentCutouts.map((cutout) => getRadialGradientStyle(cutout));

    if (currentCutouts.length === 1) {
      // Return mask style with a single cutout.
      return `mask-image: ${gradientStyles[0]}; mask-composite: exclude;`;
    }

    const fillStyles = currentCutouts.map(() => 'black');

    // Return mask style with multiple cutouts.
    return `mask-image: ${gradientStyles.join(', ')}, linear-gradient(${fillStyles.join(', ')}); mask-composite: exclude;`;
  }
</script>

<div class="container" style={getExclusionMaskStyle(cutouts)}>
  <slot />
</div>
