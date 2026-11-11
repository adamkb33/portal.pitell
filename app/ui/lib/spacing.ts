export type Space = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const stackSpaceClasses: Record<Space, string> = {
  '2xs': 'space-y-1',
  xs: 'space-y-2',
  sm: 'space-y-3',
  md: 'space-y-4',
  lg: 'space-y-6',
  xl: 'space-y-8',
  '2xl': 'space-y-12',
};

export const gapSpaceClasses: Record<Space, string> = {
  '2xs': 'gap-1',
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
  '2xl': 'gap-12',
};

export const insetSpaceClasses = {
  sm: 'p-2.5 md:p-4',
  md: 'p-3 md:p-6',
  lg: 'p-3.5 md:p-8',
} as const;

export type InsetSpace = keyof typeof insetSpaceClasses;

export const containerGutterClasses = {
  /** For pages inside the app shell, whose <main> already pads the sides. */
  none: '',
  sm: 'px-4 sm:px-5 md:px-6',
  md: 'px-4 sm:px-6 lg:px-8',
  lg: 'px-5 sm:px-6 lg:px-10',
} as const;

export type ContainerGutter = keyof typeof containerGutterClasses;
