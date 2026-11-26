export interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}
