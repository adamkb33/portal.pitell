import { Link } from 'react-router';
import {
  LegalPage,
  MailLink,
  OPERATOR_ADDRESS,
  OPERATOR_NAME,
  OPERATOR_ORG_NUMBER,
  type LegalSection,
} from '../_components/legal-page';

// The terms of use linked from the booking overview ("vilkårene"). Written from how booking actually works in the
// code (2026-11-13): cancel up to 1 hour before start, no payment in Pitell, no-show marked by the business,
// loyalty cards per business, re-acceptance when booking.terms.version changes.
// Legal must review before production; replace every TODO(legal). Keep the rules here in step with the backend.

const LAST_UPDATED = '13. november 2026';

const linkClass = 'font-medium text-interactive underline';

const SECTIONS: LegalSection[] = [
  {
    title: 'Om Pitell',
    body: (
      <p>
        Pitell er et bookingsystem som salonger og andre bedrifter bruker for timebestilling. Pitell drives av{' '}
        {OPERATOR_NAME}. Når du bestiller en time, er avtalen om selve tjenesten mellom deg og bedriften. Pitell
        formidler bestillingen.
      </p>
    ),
  },
  {
    title: 'Bestilling',
    body: (
      <ul>
        <li>Timen er bestilt når du får bekreftelsen på skjermen og på e-post eller SMS.</li>
        <li>Du må oppgi riktig navn, e-postadresse og mobilnummer. Mobilnummeret bekreftes med en kode på SMS.</li>
        <li>Varigheten som vises, er bedriftens anslag for tjenestene du har valgt.</li>
      </ul>
    ),
  },
  {
    title: 'Pris og betaling',
    body: <p>Prisene er bedriftens. Du betaler hos bedriften, ikke i Pitell. Pitell tar ingen gebyrer fra deg.</p>,
  },
  {
    title: 'Avbestilling',
    body: (
      <ul>
        <li>
          Du kan avbestille gratis inntil én time før timen starter, under Mine bookinger eller med lenken i
          bekreftelsen.
        </li>
        <li>Senere enn det må du kontakte bedriften direkte.</li>
        <li>
          Møter du ikke opp, kan bedriften registrere det. Bedriften kan ha egne regler for sen avbestilling og
          manglende oppmøte.
        </li>
      </ul>
    ),
  },
  {
    title: 'Endringer fra bedriften',
    body: (
      <p>
        Bedriften kan i spesielle tilfeller flytte eller avlyse timen din, for eksempel ved sykdom. Du får beskjed på
        e-post eller SMS.
      </p>
    ),
  },
  {
    title: 'Stempelkort',
    body: (
      <p>
        Noen bedrifter gir deg en gratis time etter et visst antall besøk. Det er bedriftens tilbud, og bedriften kan
        endre eller avslutte det.
      </p>
    ),
  },
  {
    title: 'Kontoen din',
    body: (
      <ul>
        <li>Kontoen er personlig. Hold passordet ditt hemmelig.</li>
        <li>Hold e-postadressen og mobilnummeret ditt oppdatert, så du får beskjeder om timene dine.</li>
        <li>Vi kan stenge kontoer som misbruker tjenesten, for eksempel ved gjentatte falske bestillinger.</li>
      </ul>
    ),
  },
  {
    title: 'Markedsføring',
    body: (
      <p>
        Du får bare markedsføring fra en bedrift hvis du har krysset av for det. Du kan melde deg av med lenken i hver
        melding. Det påvirker ikke bestillingene dine.
      </p>
    ),
  },
  {
    title: 'Ansvar',
    body: (
      <ul>
        <li>Bedriften er ansvarlig for tjenesten du får. Klager på den sender du til bedriften.</li>
        <li>
          Vi gjør vårt beste for at Pitell alltid virker, men kan ikke love at tjenesten aldri er nede eller har feil.
        </li>
        <li>Rettighetene dine etter forbrukerlovgivningen gjelder uansett.</li>
      </ul>
    ),
  },
  {
    title: 'Personvern',
    body: (
      <p>
        Hvordan vi behandler opplysningene dine, står i{' '}
        <Link to="/personvern" className={linkClass}>
          personvernerklæringen
        </Link>
        .
      </p>
    ),
  },
  {
    title: 'Endringer i vilkårene',
    body: (
      <p>
        Når vilkårene endres, ber vi deg godta de nye neste gang du bestiller. Datoen øverst viser når de sist ble
        endret.
      </p>
    ),
  },
  {
    title: 'Lovvalg og kontakt',
    body: (
      // TODO(legal): confirm choice of law and dispute route.
      <>
        <p>
          Norsk lov gjelder. Blir vi ikke enige, kan du få hjelp av{' '}
          <a href="https://www.forbrukerradet.no" target="_blank" rel="noreferrer" className={linkClass}>
            Forbrukerrådet
          </a>
          .
        </p>
        <p>
          {OPERATOR_NAME}, {OPERATOR_ADDRESS}, org.nr. {OPERATOR_ORG_NUMBER}. E-post: <MailLink />.
        </p>
      </>
    ),
  },
];

export function meta() {
  return [{ title: 'Vilkår – Pitell' }];
}

export default function LegalTermsRoute() {
  return <LegalPage title="Vilkår" lastUpdated={LAST_UPDATED} sections={SECTIONS} />;
}
