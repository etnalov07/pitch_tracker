import Papa from 'papaparse';
import React, { useCallback, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { teamService } from '../../services/teamService';
import { RosterImportRow } from '../../types';
import {
    DropZone,
    DropZoneSubtext,
    DropZoneText,
    ErrorBadge,
    ErrorMessage,
    ImportModeDesc,
    ImportModeOption,
    ImportModeRow,
    ImportModeTitle,
    MappingSelect,
    MappingTd,
    MappingTh,
    MappingTable,
    ModalBody,
    ModalBox,
    ModalCloseButton,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    ModalTitle,
    PreviewTd,
    PreviewTh,
    PreviewTable,
    Step,
    StepDivider,
    StepIndicator,
    SubmitButton,
    CancelButton,
    SuccessBadge,
} from './styles';

const VALID_POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UTIL'];
const VALID_BATS = ['R', 'L', 'S'];
const VALID_THROWS = ['R', 'L'];
const FIELD_OPTIONS = [
    { value: '', label: '-- ignore --' },
    { value: 'first_name', label: 'First Name *' },
    { value: 'last_name', label: 'Last Name *' },
    { value: 'jersey_number', label: 'Jersey #' },
    { value: 'primary_position', label: 'Position *' },
    { value: 'bats', label: 'Bats *' },
    { value: 'throws', label: 'Throws *' },
    { value: 'pitch_types', label: 'Pitch Types' },
];

type FieldKey = 'first_name' | 'last_name' | 'jersey_number' | 'primary_position' | 'bats' | 'throws' | 'pitch_types' | '';

type ImportStep = 'upload' | 'map' | 'preview' | 'done';

interface Props {
    teamId: string;
    onClose: () => void;
    onImported: () => void;
}

function normalizePosition(val: string): string {
    const upper = val.trim().toUpperCase();
    return VALID_POSITIONS.includes(upper) ? upper : upper;
}

function normalizeBats(val: string): string {
    const u = val.trim().toUpperCase();
    if (u === 'RIGHT' || u === 'R') return 'R';
    if (u === 'LEFT' || u === 'L') return 'L';
    if (u === 'SWITCH' || u === 'S' || u === 'B') return 'S';
    return u;
}

function normalizeThrows(val: string): string {
    const u = val.trim().toUpperCase();
    if (u === 'RIGHT' || u === 'R') return 'R';
    if (u === 'LEFT' || u === 'L') return 'L';
    return u;
}

function parsePitchTypes(val: string): string[] {
    return val
        .split(/[,;/]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function autoMap(headers: string[]): Record<string, FieldKey> {
    const mapping: Record<string, FieldKey> = {};
    headers.forEach((h) => {
        const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lower.includes('first') || lower === 'fname') mapping[h] = 'first_name';
        else if (lower.includes('last') || lower === 'lname') mapping[h] = 'last_name';
        else if (lower.includes('jersey') || lower === 'number' || lower === 'num' || lower === '#') mapping[h] = 'jersey_number';
        else if (lower.includes('position') || lower === 'pos') mapping[h] = 'primary_position';
        else if (lower === 'bats' || lower === 'bat' || lower === 'hitting') mapping[h] = 'bats';
        else if (lower === 'throws' || lower === 'throw' || lower === 'pitchinghand' || lower === 'hand') mapping[h] = 'throws';
        else if (lower.includes('pitch') && lower.includes('type')) mapping[h] = 'pitch_types';
        else mapping[h] = '';
    });
    return mapping;
}

function validateRows(rows: RosterImportRow[]): RosterImportRow[] {
    return rows.map((row) => {
        const errors: string[] = [];
        if (!row.first_name) errors.push('First name required');
        if (!row.last_name) errors.push('Last name required');
        if (!row.primary_position) errors.push('Position required');
        else if (!VALID_POSITIONS.includes(row.primary_position)) errors.push(`Invalid position: ${row.primary_position}`);
        if (!row.bats) errors.push('Bats required');
        else if (!VALID_BATS.includes(row.bats)) errors.push(`Invalid bats: ${row.bats}`);
        if (!row.throws) errors.push('Throws required');
        else if (!VALID_THROWS.includes(row.throws)) errors.push(`Invalid throws: ${row.throws}`);
        return { ...row, _errors: errors };
    });
}

const RosterImport: React.FC<Props> = ({ teamId, onClose, onImported }) => {
    const [step, setStep] = useState<ImportStep>('upload');
    const [dragActive, setDragActive] = useState(false);
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<Record<string, string>[]>([]);
    const [mapping, setMapping] = useState<Record<string, FieldKey>>({});
    const [preview, setPreview] = useState<RosterImportRow[]>([]);
    const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
    const [submitting, setSubmitting] = useState(false);
    const [importError, setImportError] = useState('');
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const processRawData = useCallback((headers: string[], data: Record<string, string>[]) => {
        setRawHeaders(headers);
        setRawData(data);
        setMapping(autoMap(headers));
        setStep('map');
    }, []);

    const handleFile = useCallback(
        (file: File) => {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (ext === 'csv') {
                Papa.parse<Record<string, string>>(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const headers = results.meta.fields || [];
                        processRawData(headers, results.data);
                    },
                });
            } else if (ext === 'xlsx' || ext === 'xls') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
                    if (json.length === 0) return;
                    const headers = Object.keys(json[0]);
                    processRawData(headers, json);
                };
                reader.readAsArrayBuffer(file);
            } else if (ext === 'json') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const parsed = JSON.parse(e.target?.result as string);
                        const arr: Record<string, string>[] = Array.isArray(parsed) ? parsed : parsed.players || [];
                        if (arr.length === 0) return;
                        const headers = Object.keys(arr[0]);
                        processRawData(headers, arr);
                    } catch {
                        setImportError('Invalid JSON file');
                    }
                };
                reader.readAsText(file);
            } else {
                setImportError('Unsupported file type. Use CSV, Excel (.xlsx), or JSON.');
            }
        },
        [processRawData]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        },
        [handleFile]
    );

    const buildPreview = () => {
        const rows: RosterImportRow[] = rawData.map((raw) => {
            const row: RosterImportRow = {
                first_name: '',
                last_name: '',
                primary_position: '',
                bats: '',
                throws: '',
            };
            Object.entries(mapping).forEach(([col, field]) => {
                if (!field) return;
                const val = String(raw[col] ?? '').trim();
                if (field === 'first_name') row.first_name = val;
                else if (field === 'last_name') row.last_name = val;
                else if (field === 'jersey_number') row.jersey_number = val ? parseInt(val, 10) || undefined : undefined;
                else if (field === 'primary_position') row.primary_position = normalizePosition(val);
                else if (field === 'bats') row.bats = normalizeBats(val);
                else if (field === 'throws') row.throws = normalizeThrows(val);
                else if (field === 'pitch_types') row.pitch_types = val ? parsePitchTypes(val) : [];
            });
            return row;
        });
        setPreview(validateRows(rows));
        setStep('preview');
    };

    const handleSubmit = async () => {
        const validRows = preview.filter((r) => r._errors && r._errors.length === 0);
        if (validRows.length === 0) {
            setImportError('No valid rows to import');
            return;
        }
        setSubmitting(true);
        setImportError('');
        try {
            const cleanRows = validRows.map(({ _errors: _e, ...rest }) => rest);
            const result = await teamService.importRoster(teamId, cleanRows, importMode);
            setImportResult(result);
            setStep('done');
        } catch {
            setImportError('Import failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const validCount = preview.filter((r) => !r._errors?.length).length;
    const errorCount = preview.filter((r) => r._errors && r._errors.length > 0).length;

    return (
        <ModalOverlay onClick={onClose}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <ModalTitle>Import Roster</ModalTitle>
                    <ModalCloseButton onClick={onClose}>&times;</ModalCloseButton>
                </ModalHeader>

                <ModalBody>
                    <StepIndicator>
                        <Step active={step === 'upload'} done={step !== 'upload'}>
                            1. Upload
                        </Step>
                        <StepDivider />
                        <Step active={step === 'map'} done={step === 'preview' || step === 'done'}>
                            2. Map Fields
                        </Step>
                        <StepDivider />
                        <Step active={step === 'preview'} done={step === 'done'}>
                            3. Preview
                        </Step>
                        <StepDivider />
                        <Step active={step === 'done'} done={false}>
                            4. Done
                        </Step>
                    </StepIndicator>

                    {importError && <ErrorMessage>{importError}</ErrorMessage>}

                    {step === 'upload' && (
                        <>
                            <DropZone
                                active={dragActive}
                                onDragEnter={() => setDragActive(true)}
                                onDragLeave={() => setDragActive(false)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => fileRef.current?.click()}
                            >
                                <DropZoneText>Drop a file here, or click to browse</DropZoneText>
                                <DropZoneSubtext>Supports CSV, Excel (.xlsx), and JSON</DropZoneSubtext>
                            </DropZone>
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".csv,.xlsx,.xls,.json"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                                }}
                            />
                            <div style={{ marginTop: '16px', fontSize: '13px', color: '#6b7280' }}>
                                <strong>Required columns:</strong> First Name, Last Name, Position, Bats, Throws
                                <br />
                                <strong>Optional:</strong> Jersey #, Pitch Types (for pitchers, comma-separated)
                            </div>
                        </>
                    )}

                    {step === 'map' && (
                        <>
                            <p style={{ marginTop: 0, fontSize: '14px', color: '#374151' }}>
                                Map your file columns to the correct fields. Columns marked * are required.
                            </p>
                            <MappingTable>
                                <thead>
                                    <tr>
                                        <MappingTh>File Column</MappingTh>
                                        <MappingTh>Sample Value</MappingTh>
                                        <MappingTh>Maps To</MappingTh>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rawHeaders.map((col) => (
                                        <tr key={col}>
                                            <MappingTd>
                                                <strong>{col}</strong>
                                            </MappingTd>
                                            <MappingTd style={{ color: '#6b7280' }}>{String(rawData[0]?.[col] ?? '')}</MappingTd>
                                            <MappingTd>
                                                <MappingSelect
                                                    value={mapping[col] ?? ''}
                                                    onChange={(e) =>
                                                        setMapping((prev) => ({ ...prev, [col]: e.target.value as FieldKey }))
                                                    }
                                                >
                                                    {FIELD_OPTIONS.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </MappingSelect>
                                            </MappingTd>
                                        </tr>
                                    ))}
                                </tbody>
                            </MappingTable>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <ImportModeRow>
                                <ImportModeOption selected={importMode === 'merge'}>
                                    <input
                                        type="radio"
                                        name="importMode"
                                        checked={importMode === 'merge'}
                                        onChange={() => setImportMode('merge')}
                                    />
                                    <div>
                                        <ImportModeTitle>Merge</ImportModeTitle>
                                        <ImportModeDesc>Add new players to existing roster</ImportModeDesc>
                                    </div>
                                </ImportModeOption>
                                <ImportModeOption selected={importMode === 'replace'}>
                                    <input
                                        type="radio"
                                        name="importMode"
                                        checked={importMode === 'replace'}
                                        onChange={() => setImportMode('replace')}
                                    />
                                    <div>
                                        <ImportModeTitle>Replace</ImportModeTitle>
                                        <ImportModeDesc>Remove all existing players first</ImportModeDesc>
                                    </div>
                                </ImportModeOption>
                            </ImportModeRow>

                            <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                                <SuccessBadge>{validCount} valid</SuccessBadge>{' '}
                                {errorCount > 0 && <ErrorBadge>{errorCount} with errors (will be skipped)</ErrorBadge>}
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <PreviewTable>
                                    <thead>
                                        <tr>
                                            <PreviewTh>#</PreviewTh>
                                            <PreviewTh>First</PreviewTh>
                                            <PreviewTh>Last</PreviewTh>
                                            <PreviewTh>Jersey</PreviewTh>
                                            <PreviewTh>Pos</PreviewTh>
                                            <PreviewTh>Bats</PreviewTh>
                                            <PreviewTh>Throws</PreviewTh>
                                            <PreviewTh>Pitch Types</PreviewTh>
                                            <PreviewTh>Status</PreviewTh>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((row, i) => {
                                            const hasError = row._errors && row._errors.length > 0;
                                            return (
                                                <tr key={i}>
                                                    <PreviewTd>{i + 1}</PreviewTd>
                                                    <PreviewTd>{row.first_name}</PreviewTd>
                                                    <PreviewTd>{row.last_name}</PreviewTd>
                                                    <PreviewTd>{row.jersey_number ?? '—'}</PreviewTd>
                                                    <PreviewTd hasError={!VALID_POSITIONS.includes(row.primary_position)}>
                                                        {row.primary_position}
                                                    </PreviewTd>
                                                    <PreviewTd hasError={!VALID_BATS.includes(row.bats)}>{row.bats}</PreviewTd>
                                                    <PreviewTd hasError={!VALID_THROWS.includes(row.throws)}>
                                                        {row.throws}
                                                    </PreviewTd>
                                                    <PreviewTd>{row.pitch_types?.join(', ') || '—'}</PreviewTd>
                                                    <PreviewTd>
                                                        {hasError ? (
                                                            <ErrorBadge title={row._errors?.join(', ')}>
                                                                {row._errors?.[0]}
                                                            </ErrorBadge>
                                                        ) : (
                                                            <SuccessBadge>OK</SuccessBadge>
                                                        )}
                                                    </PreviewTd>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </PreviewTable>
                            </div>
                        </>
                    )}

                    {step === 'done' && importResult && (
                        <div style={{ textAlign: 'center', padding: '32px 0' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                            <p style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
                                Import complete
                            </p>
                            <p style={{ color: '#6b7280', margin: '0 0 16px' }}>
                                {importResult.imported} players imported
                                {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
                            </p>
                            {importResult.errors.length > 0 && (
                                <div style={{ textAlign: 'left' }}>
                                    {importResult.errors.map((e, i) => (
                                        <ErrorMessage key={i}>{e}</ErrorMessage>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </ModalBody>

                <ModalFooter>
                    {step === 'upload' && <CancelButton onClick={onClose}>Cancel</CancelButton>}

                    {step === 'map' && (
                        <>
                            <CancelButton onClick={() => setStep('upload')}>Back</CancelButton>
                            <SubmitButton onClick={buildPreview}>Preview &rarr;</SubmitButton>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <CancelButton onClick={() => setStep('map')}>Back</CancelButton>
                            <SubmitButton onClick={handleSubmit} disabled={submitting || validCount === 0}>
                                {submitting ? 'Importing...' : `Import ${validCount} Players`}
                            </SubmitButton>
                        </>
                    )}

                    {step === 'done' && (
                        <SubmitButton
                            onClick={() => {
                                onImported();
                                onClose();
                            }}
                        >
                            Done
                        </SubmitButton>
                    )}
                </ModalFooter>
            </ModalBox>
        </ModalOverlay>
    );
};

export default RosterImport;
