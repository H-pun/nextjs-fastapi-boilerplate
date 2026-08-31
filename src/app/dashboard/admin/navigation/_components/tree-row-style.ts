/**
 * Twenty-odd rows each carrying a grip, a pencil and two arrows turns the pane
 * into noise. The controls hold their space but stay invisible until the row is
 * hovered or something inside it takes focus, so keyboard users still reach
 * them and nothing shifts when they appear.
 */
export const ROW_GROUP = "group/row";

/**
 * `disabled:opacity-0` has to stay: a disabled control carries an opacity of
 * its own (Button's `disabled:opacity-50`), and `:disabled` outweighs a plain
 * `opacity-0`, so without it every switched-off control sits there unhovered.
 */
export const REVEAL =
  "opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 focus-visible:opacity-100 disabled:opacity-0 disabled:group-hover/row:opacity-30";

/**
 * The controls float over the end of the row, so a long title would otherwise
 * be chopped mid-letter the moment they appear. Masking the label — rather
 * than painting a panel behind the controls — means nothing has to match the
 * row's background, which changes with hover and selection.
 *
 * `--actions-w` is how far the controls reach in from the right; the title is
 * gone by then and fades over the 2rem before it.
 *
 * Written out twice rather than composed: Tailwind reads these files as text,
 * so a class name built at runtime would never be generated.
 */
export const FADE_UNDER_ACTIONS =
  "group-hover/row:[mask-image:linear-gradient(to_left,transparent_var(--actions-w),black_calc(var(--actions-w)_+_2rem))] group-focus-within/row:[mask-image:linear-gradient(to_left,transparent_var(--actions-w),black_calc(var(--actions-w)_+_2rem))]";
