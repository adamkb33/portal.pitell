import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Text,
  Textarea,
  cn,
} from '~/ui';
import { CAMPAIGN_LIMITS } from '../_schemas/campaign.create.schema';
import {
  BLOCK_LABELS,
  BLOCK_TYPES,
  addBlock,
  canAddBlock,
  moveBlock,
  removeBlock,
  updateBlock,
  type EditableBlock,
} from '../_utils/email-blocks';

type EmailBlockEditorProps = {
  blocks: EditableBlock[];
  onChange: (blocks: EditableBlock[]) => void;
  /** Messages keyed by `${index}.text` and `${index}.url`. */
  errors?: Record<string, string>;
};

/** The email content as a list of blocks: no drag and drop, no rich text. */
export function EmailBlockEditor({ blocks, onChange, errors = {} }: EmailBlockEditorProps) {
  return (
    <div className="grid gap-4">
      {blocks.map((block, index) => {
        const textError = errors[`${index}.text`];
        const urlError = errors[`${index}.url`];
        const label = BLOCK_LABELS[block.type];
        const setText = (text: string) => onChange(updateBlock(blocks, index, { text }));

        return (
          <section
            key={block.id}
            aria-label={`${label} ${index + 1}`}
            className="border-b border-border pb-4 last:border-b-0"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <Text as="span" variant="caption" className="font-semibold text-text-secondary">
                {label}
              </Text>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Flytt opp"
                  disabled={index === 0}
                  onClick={() => onChange(moveBlock(blocks, index, -1))}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Flytt ned"
                  disabled={index === blocks.length - 1}
                  onClick={() => onChange(moveBlock(blocks, index, 1))}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Slett"
                  onClick={() => onChange(removeBlock(blocks, index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {block.type === 'HEADING' ? (
              <Input
                aria-label={label}
                value={block.text}
                maxLength={CAMPAIGN_LIMITS.heading}
                onChange={(event) => setText(event.target.value)}
                aria-invalid={textError ? true : undefined}
                className={cn(textError && 'border-danger')}
                data-merge-field=""
              />
            ) : null}

            {block.type === 'PARAGRAPH' ? (
              <Textarea
                aria-label={label}
                rows={4}
                value={block.text}
                maxLength={CAMPAIGN_LIMITS.paragraph}
                onChange={(event) => setText(event.target.value)}
                aria-invalid={textError ? true : undefined}
                className={cn(textError && 'border-danger')}
                data-merge-field=""
              />
            ) : null}

            {block.type === 'BUTTON' ? (
              <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <Input
                  aria-label="Knappetekst"
                  placeholder="Knappetekst"
                  value={block.text}
                  maxLength={CAMPAIGN_LIMITS.buttonLabel}
                  onChange={(event) => setText(event.target.value)}
                  aria-invalid={textError ? true : undefined}
                  className={cn(textError && 'border-danger')}
                  data-merge-field=""
                />
                <Input
                  aria-label="Lenke"
                  placeholder="https://"
                  inputMode="url"
                  autoComplete="off"
                  value={block.url}
                  maxLength={CAMPAIGN_LIMITS.buttonUrl}
                  onChange={(event) => onChange(updateBlock(blocks, index, { url: event.target.value }))}
                  aria-invalid={urlError ? true : undefined}
                  className={cn(urlError && 'border-danger')}
                />
              </div>
            ) : null}

            {[textError, urlError].filter(Boolean).map((message) => (
              <Text key={message} as="p" variant="caption" className="mt-1 text-danger">
                {message}
              </Text>
            ))}
          </section>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="justify-self-start" disabled={!canAddBlock(blocks)}>
            <Plus className="h-4 w-4" /> Legg til blokk <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {BLOCK_TYPES.map((type) => (
            <DropdownMenuItem key={type} onSelect={() => onChange(addBlock(blocks, type))}>
              {BLOCK_LABELS[type]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
