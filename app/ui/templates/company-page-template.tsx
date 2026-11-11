import { PageTemplate, type PageTemplateProps } from './page-template';

export interface CompanyPageTemplateProps extends PageTemplateProps {}

export function CompanyPageTemplate(props: CompanyPageTemplateProps) {
  return <PageTemplate hideTitle {...props} />;
}
