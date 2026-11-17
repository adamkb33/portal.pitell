import type { Route } from './+types/auth.collect-email.route';
import { CollectContactStep } from '../_components/collect-contact-step';
import { loadCollectContact, saveCollectContact } from '../_utils/collect-contact.server';

export function loader({ request }: Route.LoaderArgs) {
  return loadCollectContact(request);
}

export function action({ request }: Route.ActionArgs) {
  return saveCollectContact(request, 'email');
}

export default function AuthCollectEmail() {
  return <CollectContactStep kind="email" />;
}
