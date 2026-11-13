import {
  LegalPage,
  MailLink,
  OPERATOR_ADDRESS,
  OPERATOR_NAME,
  OPERATOR_ORG_NUMBER,
  type LegalSection,
} from '../_components/legal-page';

// The privacy notice linked from the booking overview ("personvernerklæringen"). Written from what the code
// actually stores and sends (2026-11-13). Legal and the DPO must review it before production; replace every TODO(legal).
// When the data model changes (a new table with personal data, a new provider), update this page.

// TODO(legal): where the S3 bucket for images actually runs.
const IMAGE_STORAGE = 'lagring av bilder i EU/EØS';

const LAST_UPDATED = '13. november 2026';

const SECTIONS: LegalSection[] = [
  {
    title: 'Hvem som er ansvarlig',
    body: (
      <>
        <p>
          Pitell er et bookingsystem som salonger og andre bedrifter bruker for timebestilling. Ansvaret for
          opplysningene dine er delt:
        </p>
        <ul>
          <li>
            <strong>Bedriften du bestiller hos</strong> er behandlingsansvarlig for timene dine hos dem og det de
            registrerer om deg. Pitell behandler disse opplysningene på vegne av bedriften.
          </li>
          <li>
            <strong>{OPERATOR_NAME}</strong> (org.nr. {OPERATOR_ORG_NUMBER}), som driver Pitell, er behandlingsansvarlig
            for brukerkontoen din, innlogging og sikkerheten i tjenesten.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: 'Når du bestiller time',
    body: (
      <ul>
        <li>Navn, e-postadresse og mobilnummer.</li>
        <li>Timen: bedrift, tjenester, ansatt, tidspunkt og om timen er avbestilt.</li>
        <li>At du har godtatt vilkårene og denne erklæringen, med versjon og tidspunkt.</li>
        <li>
          Engangskoden vi sender på SMS for å bekrefte mobilnummeret, og IP-adressen forespørselen kom fra, for å hindre
          misbruk.
        </li>
        <li>Bilder bedriften laster opp til timen din, for eksempel av resultatet.</li>
      </ul>
    ),
  },
  {
    title: 'Når du har konto',
    body: (
      <ul>
        <li>Navn, e-postadresse, mobilnummer og om nummeret er bekreftet.</li>
        <li>Passordet ditt, lagret som en kryptert hash som ingen kan lese.</li>
        <li>Logger du inn med Google, får vi navn, e-postadresse og Google-ID-en din fra Google.</li>
        <li>Bestillingene dine hos alle bedrifter, så du kan se og avbestille dem under Mine bookinger.</li>
      </ul>
    ),
  },
  {
    title: 'Meldinger vi sender',
    body: (
      <>
        <p>
          Vi sender bekreftelser, endringer, avbestillinger og påminnelser om timene dine på e-post og SMS. Det er en
          del av bestillingen og ikke markedsføring. Vi lagrer hver melding med mottakeradresse, innhold og tidspunkt,
          så vi kan se om den ble levert.
        </p>
      </>
    ),
  },
  {
    title: 'Markedsføring',
    body: (
      <>
        <p>
          Bare hvis du krysser av for det når du bestiller, kan bedriften sende deg tilbud og nyheter på e-post eller
          SMS. Det er frivillig og påvirker ikke bestillingen. Vi lagrer hva du har sagt ja eller nei til, for hvilken
          kanal, når og med hvilken tekst.
        </p>
        <p>
          Hver melding har en lenke for å melde seg av. Etter at du har meldt deg av, får du ingen flere, og bedriften
          kan ikke melde deg på igjen.
        </p>
      </>
    ),
  },
  {
    title: 'Hvis du jobber i en bedrift som bruker Pitell',
    body: (
      <ul>
        <li>Navn, e-postadresse, mobilnummer og rollene dine i bedriften.</li>
        <li>Arbeidstider, fravær, timelister og avtalene du har med kunder.</li>
        <li>Tilbud du lager og kontaktpersonene hos kundene de sendes til.</li>
        <li>Varsler i appen om nye og endrede avtaler.</li>
      </ul>
    ),
  },
  {
    title: 'Hvorfor vi har lov',
    body: (
      <ul>
        <li>Bestilling, konto og meldinger om timene: for å oppfylle avtalen med deg (GDPR art. 6 nr. 1 b).</li>
        <li>Markedsføring: samtykket ditt (art. 6 nr. 1 a), som du kan trekke tilbake når som helst.</li>
        <li>
          Sikkerhet, engangskoder, IP-adresse og feillogger: vår berettigede interesse i å holde tjenesten trygg og
          virksom (art. 6 nr. 1 f).
        </li>
        <li>Ansattes data: bedriftens avtale med den ansatte og bedriftens berettigede interesse.</li>
      </ul>
    ),
  },
  {
    title: 'Hvem vi deler med',
    body: (
      <>
        <p>Vi selger aldri opplysningene dine. De deles bare med:</p>
        <ul>
          <li>Bedriften du bestiller hos, som ser timen og kontaktopplysningene dine.</li>
          <li>Render, som drifter servere og database i Frankfurt (EU).</li>
          <li>Webhuset, som sender e-post.</li>
          <li>Sveve, som sender SMS.</li>
          <li>Leverandøren vår for {IMAGE_STORAGE}.</li>
          <li>Google, hvis du logger inn med Google. Nettsiden henter også skrifttyper fra Google Fonts.</li>
        </ul>
        <p>Leverandørene behandler opplysningene bare på våre vegne og etter databehandleravtale.</p>
      </>
    ),
  },
  {
    title: 'Informasjonskapsler',
    body: (
      <>
        <p>Vi bruker bare informasjonskapsler som trengs for at tjenesten skal virke:</p>
        <ul>
          <li>Innlogging, som holder deg innlogget i opptil 14 dager.</li>
          <li>Bestillingen du er i gang med, som varer i opptil ett døgn.</li>
          <li>Korte beskjeder som «Timen er avbestilt», som slettes etter noen sekunder.</li>
        </ul>
        <p>Vi bruker ikke analyse- eller reklamekapsler, og sporer deg ikke på andre nettsider.</p>
      </>
    ),
  },
  {
    title: 'Hvor lenge vi lagrer',
    body: (
      // TODO(legal): confirm retention. Today nothing is deleted automatically.
      <ul>
        <li>Konto og bestillinger: så lenge du har konto, eller til du ber oss slette dem.</li>
        <li>Markedsføringssvar: så lenge bedriften bruker Pitell, så et nei alltid blir respektert.</li>
        <li>Engangskoder: gyldige i kort tid og kan ikke brukes igjen.</li>
      </ul>
    ),
  },
  {
    title: 'Rettighetene dine',
    body: (
      <>
        <p>
          Du kan be om innsyn, retting, sletting og en kopi av opplysningene dine, og du kan protestere mot eller be oss
          begrense behandlingen. Skriv til <MailLink />. Gjelder det en time hos en bestemt bedrift, sender vi saken
          videre til dem. Vi svarer innen 30 dager.
        </p>
        <p>
          Er du uenig i hvordan vi behandler opplysningene dine, kan du klage til{' '}
          <a
            href="https://www.datatilsynet.no"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-interactive underline"
          >
            Datatilsynet
          </a>
          .
        </p>
      </>
    ),
  },
  {
    title: 'Kontakt',
    body: (
      <p>
        {OPERATOR_NAME}, {OPERATOR_ADDRESS}, org.nr. {OPERATOR_ORG_NUMBER}. E-post: <MailLink />.
      </p>
    ),
  },
];

export function meta() {
  return [{ title: 'Personvernerklæring – Pitell' }];
}

export default function LegalPrivacyRoute() {
  return <LegalPage title="Personvernerklæring" lastUpdated={LAST_UPDATED} sections={SECTIONS} />;
}
