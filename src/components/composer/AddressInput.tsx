import { useState, useRef, useCallback, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { searchContactsForAccount, type ContactSuggestion } from "@/services/db/contacts";

interface AddressInputProps {
  label: string;
  addresses: string[];
  onChange: (addresses: string[]) => void;
  placeholder?: string;
  /** Account the message will be sent from — decides suggestion ranking. */
  accountId?: string | null;
}

export function AddressInput({
  label,
  addresses,
  onChange,
  placeholder = "Add recipients...",
  accountId = null,
}: AddressInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  /** A suggestion from another mailbox, awaiting confirmation. */
  const [pendingForeign, setPendingForeign] = useState<ContactSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (value.length >= 2) {
        searchTimerRef.current = setTimeout(async () => {
          const results = await searchContactsForAccount(value, accountId, 6);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
          setSelectedIdx(-1);
        }, 200);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    },
    [accountId],
  );

  /**
   * Adding a contact that has only ever appeared in a different mailbox is the
   * easy way to send a client's mail from a personal account, so it asks first.
   */
  const chooseSuggestion = useCallback(
    (contact: ContactSuggestion) => {
      if (!contact.knownHere && contact.otherAccountEmails.length > 0) {
        setPendingForeign(contact);
        return;
      }
      addAddress(contact.email);
    },
    // addAddress is defined below and is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const addAddress = useCallback(
    (address: string) => {
      const trimmed = address.trim();
      if (trimmed && !addresses.includes(trimmed)) {
        onChange([...addresses, trimmed]);
      }
      setInputValue("");
      setSuggestions([]);
      setShowSuggestions(false);
      setPendingForeign(null);
      inputRef.current?.focus();
    },
    [addresses, onChange],
  );

  const removeAddress = useCallback(
    (index: number) => {
      onChange(addresses.filter((_, i) => i !== index));
    },
    [addresses, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
      e.preventDefault();
      if (showSuggestions && selectedIdx >= 0) {
        chooseSuggestion(suggestions[selectedIdx]!);
      } else if (inputValue.trim()) {
        addAddress(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && addresses.length > 0) {
      removeAddress(addresses.length - 1);
    } else if (e.key === "ArrowDown" && showSuggestions) {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp" && showSuggestions) {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-text-tertiary pt-1.5 w-8 shrink-0">
        {label}
      </span>
      <div className="flex-1 flex flex-wrap items-center gap-1 min-h-[32px] relative">
        {addresses.map((addr) => (
          <span
            key={addr}
            className="inline-flex items-center gap-1 bg-accent-light text-accent text-xs px-2 py-0.5 rounded-full"
          >
            {addr}
            <button
              onClick={() => onChange(addresses.filter((a) => a !== addr))}
              className="hover:text-danger text-[0.625rem] leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay to allow click on suggestion
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
            blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 150);
            if (inputValue.trim()) addAddress(inputValue);
          }}
          placeholder={addresses.length === 0 ? placeholder : ""}
          aria-label={label}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
        />

        {/* Autocomplete dropdown */}
        {showSuggestions && (
          <div className="absolute top-full left-0 mt-1 w-full bg-bg-primary border border-border-primary rounded-md shadow-lg z-50 py-1">
            {suggestions.map((contact, i) => {
              const foreign = !contact.knownHere && contact.otherAccountEmails.length > 0;
              return (
                <button
                  key={contact.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => chooseSuggestion(contact)}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-bg-hover ${
                    i === selectedIdx ? "bg-bg-hover" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-text-primary">
                      {contact.display_name ?? contact.email}
                    </span>
                    {foreign && (
                      <span className="ml-auto shrink-0 rounded-full bg-warning/15 px-1.5 text-[0.625rem] leading-normal text-warning">
                        other mailbox
                      </span>
                    )}
                  </div>
                  {contact.display_name && (
                    <div className="truncate text-xs text-text-tertiary">
                      {contact.email}
                    </div>
                  )}
                  {foreign && (
                    <div className="truncate text-[0.625rem] text-text-tertiary">
                      from {contact.otherAccountEmails.join(", ")}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Confirmation for an address this account has never written to */}
        {pendingForeign && (
          <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border border-warning/40 bg-bg-primary p-3 shadow-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-text-primary">
                  {pendingForeign.display_name ?? pendingForeign.email}
                </div>
                <div className="mt-0.5 text-xs text-text-secondary">
                  Known from {pendingForeign.otherAccountEmails.join(", ")}, and not
                  used from this account before. Add anyway?
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addAddress(pendingForeign.email)}
                    className="rounded bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover"
                  >
                    Add anyway
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setPendingForeign(null)}
                    className="rounded px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
