import type { Route } from './+types/auth.collect-mobile.route';
import { CollectContactStep } from '../_components/collect-contact-step';
import { loadCollectContact, saveCollectContact } from '../_utils/collect-contact.server';

export function loader({ request }: Route.LoaderArgs) {
  return loadCollectContact(request);
}

export function action({ request }: Route.ActionArgs) {
  return saveCollectContact(request, 'mobile');
}

export default function AuthCollectMobile() {
  return <CollectContactStep kind="mobile" />;
}
