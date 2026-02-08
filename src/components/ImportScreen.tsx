import { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, CheckCircle, XCircle, AlertCircle, Loader2, ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import AppHeader from './AppHeader';
import { Organization, User, UserRole } from '../utils/supabase/types';
import { GIG_STATUS_CONFIG } from '../utils/supabase/constants';
import { getTimezoneOptions } from '../utils/timezones';
import {
  parseAndValidateCSV,
  downloadTemplate,
  validateGigRow,
  validateAssetRow,
  type ImportType,
  type ParsedRow,
  type GigRow,
  type AssetRow,
  parseBoolean,
  parseTags,
  findOrCreateOrganization,
} from '../utils/csvImport';
import { createGig } from '../services/gig.service';
import { createAsset } from '../services/asset.service';
import { searchOrganizations, createOrganization } from '../services/organization.service';
import { createClient } from '../utils/supabase/client';
import { parseLocalToUTC, formatInTimeZone } from '../utils/dateUtils';

interface ImportScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onCancel: () => void;
  onNavigateToGigs: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
}

export default function ImportScreen({
  organization,
  user,
  userRole,
  onCancel,
  onNavigateToGigs,
  onSwitchOrganization,
  onLogout,
}: ImportScreenProps) {
  const [importType, setImportType] = useState<ImportType>('gigs');

  // Helper function to format datetime for display in import preview
  const formatDateTimeForPreview = (dateStr: string, timezone?: string): string => {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      
      // Check if this is a date-only entry (midnight UTC)
      if (dateStr.endsWith('T00:00:00.000Z')) {
        // For date-only entries, just show the date
        return formatInTimeZone(date, timezone, {
          month: '2-digit',
          day: '2-digit', 
          year: 'numeric',
        });
      } else {
        // For entries with time, show date and time in gig timezone
        return formatInTimeZone(date, timezone, {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    } catch (error) {
      console.error('Error formatting date for preview:', error);
      return dateStr;
    }
  };
  const [file, setFile] = useState<File | null>(null);
  const [validRows, setValidRows] = useState<ParsedRow<GigRow | AssetRow>[]>([]);
  const [invalidRows, setInvalidRows] = useState<ParsedRow<GigRow | AssetRow>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setImportResults(null);

    try {
      const result = await parseAndValidateCSV(selectedFile, importType, user?.timezone);
      setValidRows(result.validRows);
      setInvalidRows(result.invalidRows);
      
      if (result.invalidRows.length > 0) {
        toast.warning(`${result.invalidRows.length} row(s) have validation errors. Please fix them before importing.`);
      } else {
        toast.success(`All ${result.validRows.length} row(s) are valid and ready to import.`);
      }
    } catch (error: any) {
      console.error('Error parsing CSV:', error);
      toast.error(error.message || 'Failed to parse CSV file');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  }, [importType]);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleDownloadTemplate = () => {
    downloadTemplate(importType);
  };

  const handleEditInvalidRow = (rowIndex: number, field: string, value: string) => {
    setInvalidRows(prev => prev.map(row => {
      if (row.rowIndex === rowIndex) {
        const updatedData = { ...row.data, [field]: value };
        // Re-validate the row
        if (importType === 'gigs') {
          const validated = validateGigRow(updatedData, rowIndex, user?.timezone);
          return validated as ParsedRow<GigRow | AssetRow>;
        } else {
          const validated = validateAssetRow(updatedData, rowIndex);
          return validated as ParsedRow<GigRow | AssetRow>;
        }
      }
      return row;
    }));
  };

  // Helper function to get rows ready for import
  const getReadyToImportRows = () => {
    return validRows.filter(row => !row.importStatus || row.importStatus === 'pending');
  };

  const handleImportValidRows = async () => {
    const readyRows = getReadyToImportRows();
    if (readyRows.length === 0) {
      toast.error('No rows ready to import');
      return;
    }

    setIsImporting(true);
    setImportResults(null);
    const errors: string[] = [];
    let successCount = 0;

    // Only process rows that are ready for import
    const updatedValidRows = [...validRows];
    readyRows.forEach(row => {
      const rowInList = updatedValidRows.find(r => r.rowIndex === row.rowIndex);
      if (rowInList) {
        rowInList.importStatus = 'pending';
        rowInList.importError = undefined;
      }
    });
    setValidRows([...updatedValidRows]);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      if (importType === 'gigs') {
        // Import gigs - only process ready rows
        for (let i = 0; i < readyRows.length; i++) {
          const row = readyRows[i];
          try {
            // Update status to importing
            row.importStatus = 'importing';
            setValidRows(prev => prev.map(r => r.rowIndex === row.rowIndex ? row : r));

            const gigData = row.data as GigRow;
            
            // Find or create act/venue organizations
            let actOrgId: string | undefined;
            let venueOrgId: string | undefined;

            if (gigData.act && gigData.act.trim()) {
              const actOrg = await findOrCreateOrganization(
                gigData.act,
                'Act',
                searchOrganizations,
                async (orgData) => {
                  const created = await createOrganization({
                    name: orgData.name,
                    type: orgData.type,
                  });
                  // Convert to Organization type
                  return {
                    id: created.id,
                    name: created.name,
                    type: created.type as any,
                    created_at: created.created_at,
                    updated_at: created.updated_at,
                  };
                }
              );
              actOrgId = actOrg.id;
            }

            if (gigData.venue && gigData.venue.trim()) {
              const venueOrg = await findOrCreateOrganization(
                gigData.venue,
                'Venue',
                searchOrganizations,
                async (orgData) => {
                  const created = await createOrganization({
                    name: orgData.name,
                    type: orgData.type,
                  });
                  // Convert to Organization type
                  return {
                    id: created.id,
                    name: created.name,
                    type: created.type as any,
                    created_at: created.created_at,
                    updated_at: created.updated_at,
                  };
                }
              );
              venueOrgId = venueOrg.id;
            }

            // Create gig
            const participants: Array<{ organization_id: string; role: string }> = [];
            if (actOrgId) {
              participants.push({ organization_id: actOrgId, role: 'Act' });
            }
            if (venueOrgId) {
              participants.push({ organization_id: venueOrgId, role: 'Venue' });
            }
            // Add current organization as participant
            participants.push({ organization_id: organization.id, role: organization.type });

            const createdGig = await createGig({
              title: gigData.title,
              start: parseLocalToUTC(gigData.start, gigData.timezone),
              end: parseLocalToUTC(gigData.end, gigData.timezone),
              timezone: gigData.timezone,
              status: gigData.status as any,
              tags: parseTags(gigData.tags),
              notes: gigData.notes || undefined,
              amount: gigData.amount ? parseFloat(gigData.amount) : undefined,
              primary_organization_id: organization.id,
              participants: participants,
            });

            // Mark as success
            row.importStatus = 'success';
            row.importError = undefined;
            setValidRows(prev => prev.map(r => r.rowIndex === row.rowIndex ? row : r));
            successCount++;
          } catch (error: any) {
            let errorMessage = 'Failed to import gig';
            
            // Provide user-friendly error messages
            if (error.message) {
              if (error.message.includes('duplicate key value')) {
                errorMessage = 'A gig with similar data already exists';
              } else if (error.message.includes('invalid input syntax')) {
                errorMessage = 'Invalid date or time format';
              } else if (error.message.includes('foreign key constraint')) {
                errorMessage = 'Related organization not found';
              } else if (error.message.includes('not null constraint')) {
                errorMessage = 'Missing required field';
              } else if (error.message.includes('check constraint')) {
                errorMessage = 'Invalid data format or value';
              } else {
                errorMessage = error.message.length > 100 ? 
                  error.message.substring(0, 100) + '...' : 
                  error.message;
              }
            }
            
            row.importStatus = 'failed';
            row.importError = errorMessage;
            setValidRows(prev => prev.map(r => r.rowIndex === row.rowIndex ? row : r));
            errors.push(`Row ${row.rowIndex}: ${errorMessage}`);
          }
        }
      } else {
        // Import assets - only process ready rows
        for (let i = 0; i < readyRows.length; i++) {
          const row = readyRows[i];
          try {
            // Update status to importing
            row.importStatus = 'importing';
            setValidRows(prev => prev.map(r => r.rowIndex === row.rowIndex ? row : r));

            const assetData = row.data as AssetRow;
            
            await createAsset({
              organization_id: organization.id,
              category: assetData.category,
              sub_category: assetData['sub-category'] || undefined,
              manufacturer_model: assetData.manufacturer_model,
              type: assetData.equipment_type || undefined,
              serial_number: assetData.serial_number || undefined,
              acquisition_date: assetData.acquisition_date,
              vendor: assetData.vendor || undefined,
              cost: assetData.cost_per_item ? parseFloat(assetData.cost_per_item) : undefined,
              replacement_value: assetData.replacement_value_per_item ? parseFloat(assetData.replacement_value_per_item) : undefined,
              description: assetData.notes || undefined,
              insurance_policy_added: parseBoolean(assetData.insured),
              insurance_class: assetData.insurance_category || undefined,
              quantity: assetData.quantity ? parseInt(assetData.quantity) : undefined,
            });

            // Mark as success
            row.importStatus = 'success';
            row.importError = undefined;
            setValidRows(prev => prev.map(r => r.rowIndex === row.rowIndex ? row : r));
            successCount++;
          } catch (error: any) {
            let errorMessage = 'Failed to import asset';
            
            // Provide user-friendly error messages
            if (error.message) {
              if (error.message.includes('duplicate key value')) {
                errorMessage = 'An asset with similar data already exists';
              } else if (error.message.includes('invalid input syntax')) {
                errorMessage = 'Invalid date or number format';
              } else if (error.message.includes('foreign key constraint')) {
                errorMessage = 'Related organization not found';
              } else if (error.message.includes('not null constraint')) {
                errorMessage = 'Missing required field';
              } else if (error.message.includes('check constraint')) {
                errorMessage = 'Invalid data format or value';
              } else {
                errorMessage = error.message.length > 100 ? 
                  error.message.substring(0, 100) + '...' : 
                  error.message;
              }
            }
            
            row.importStatus = 'failed';
            row.importError = errorMessage;
            setValidRows(prev => prev.map(r => r.rowIndex === row.rowIndex ? row : r));
            errors.push(`Row ${row.rowIndex}: ${errorMessage}`);
          }
        }
      }

      setImportResults({ success: successCount, errors });
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} ${importType === 'gigs' ? 'gig(s)' : 'asset(s)'}`);
        // Keep all rows visible to show import status - don't remove or navigate
      }
      
      if (errors.length > 0) {
        toast.error(`Failed to import ${errors.length} row(s). Check errors below.`);
      }
    } catch (error: any) {
      console.error('Error importing rows:', error);
      toast.error(error.message || 'Failed to import rows');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRevalidateInvalidRows = () => {
    // Move fixed rows from invalid to valid
    const fixedRows = invalidRows.filter(row => row.isValid);
    const stillInvalid = invalidRows.filter(row => !row.isValid);
    
    if (fixedRows.length > 0) {
      setValidRows(prev => [...prev, ...fixedRows]);
      setInvalidRows(stillInvalid);
      toast.success(`Moved ${fixedRows.length} fixed row(s) to valid rows`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="import"
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Upload className="w-6 h-6 text-sky-500" />
            CSV Import
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Import {importType === 'gigs' ? 'gigs' : 'assets'} from a CSV file
          </p>
        </div>

        {/* Import Type Selection */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="import-type">Import Type</Label>
                <p className="text-sm text-gray-500 mt-1">Select what you want to import</p>
              </div>
              <Select value={importType} onValueChange={(value) => {
                setImportType(value as ImportType);
                setFile(null);
                setValidRows([]);
                setInvalidRows([]);
                setImportResults(null);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gigs">Gigs</SelectItem>
                  <SelectItem value="assets">Assets</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Template
              </Button>
              <p className="text-sm text-gray-500">
                Download a CSV template with example data
              </p>
            </div>
          </div>
        </Card>

        {/* File Upload */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Upload CSV File</Label>
              {(validRows.length > 0 || invalidRows.length > 0) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setValidRows([]);
                    setInvalidRows([]);
                    setImportResults(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Start New Import
                </Button>
              )}
            </div>
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-sky-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                  <p className="text-gray-600">Processing CSV file...</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-8 h-8 text-sky-500" />
                  <p className="text-gray-900 font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">Click to select a different file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <p className="text-gray-900 font-medium">Drop CSV file here or click to browse</p>
                  <p className="text-sm text-gray-500">Supports .csv files</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Results Summary */}
        {(validRows.length > 0 || invalidRows.length > 0) && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Import Summary</h2>
              {(() => {
                const readyCount = getReadyToImportRows().length;
                return readyCount > 0 && (
                  <Button
                    onClick={handleImportValidRows}
                    disabled={isImporting}
                    className="bg-sky-500 hover:bg-sky-600 text-white"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Import {readyCount} Ready Row(s)
                      </>
                    )}
                  </Button>
                );
              })()}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">{validRows.length}</p>
                  <p className="text-sm text-green-700">Valid rows</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">{invalidRows.length}</p>
                  <p className="text-sm text-red-700">Invalid rows</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Import Results */}
        {importResults && (
          <Card className="p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {importResults.errors.length > 0 ? (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                Import Results
              </h2>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-700">
                    {importResults.success} successfully imported
                  </span>
                </div>
                {importResults.errors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-red-700">
                      {importResults.errors.length} failed
                    </span>
                  </div>
                )}
              </div>
              {invalidRows.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Next steps:</strong> Fix the invalid rows below and use "Re-validate & Import Fixed Rows" to continue.
                  </p>
                </div>
              )}
              {importResults.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                    View detailed error messages
                  </summary>
                  <ul className="list-disc list-inside space-y-1 text-sm mt-2 ml-4 text-gray-600">
                    {importResults.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </Card>
        )}

        {/* Invalid Rows Table with Editing */}
        {invalidRows.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Invalid Rows ({invalidRows.length})
              </h2>
              <Button
                variant="outline"
                onClick={handleRevalidateInvalidRows}
                disabled={invalidRows.length === 0}
              >
                Re-validate Fixed Rows
              </Button>
            </div>
            <div className="space-y-4">
              {invalidRows.map((row) => (
                <div key={row.rowIndex} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-red-900">Row {row.rowIndex}</span>
                    {row.isValid && (
                      <Badge className="bg-green-100 text-green-800">Fixed</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    {importType === 'gigs' ? (
                      <>
                        <div>
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={(row.data as GigRow).title}
                            onChange={(e) => handleEditInvalidRow(row.rowIndex, 'title', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Start</Label>
                          <div className="space-y-1">
                            <Input
                              value={(row.data as GigRow).start}
                              onChange={(e) => handleEditInvalidRow(row.rowIndex, 'start', e.target.value)}
                              className="h-8 text-sm"
                              placeholder="2024-07-15T18:00:00"
                            />
                            {(row.data as GigRow).start && (
                              <div className="text-xs text-gray-600">
                                {formatDateTimeForPreview((row.data as GigRow).start, (row.data as GigRow).timezone)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">End</Label>
                          <div className="space-y-1">
                            <Input
                              value={(row.data as GigRow).end}
                              onChange={(e) => handleEditInvalidRow(row.rowIndex, 'end', e.target.value)}
                              className="h-8 text-sm"
                              placeholder="2024-07-15T22:00:00"
                            />
                            {(row.data as GigRow).end && (
                              <div className="text-xs text-gray-600">
                                {formatDateTimeForPreview((row.data as GigRow).end, (row.data as GigRow).timezone)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Timezone</Label>
                          <Select
                            value={(row.data as GigRow).timezone}
                            onValueChange={(value) => handleEditInvalidRow(row.rowIndex, 'timezone', value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                              {getTimezoneOptions().map(tz => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <Select
                            value={(row.data as GigRow).status}
                            onValueChange={(value) => handleEditInvalidRow(row.rowIndex, 'status', value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(GIG_STATUS_CONFIG).map(([value, config]) => (
                                <SelectItem key={value} value={value}>
                                  {config.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Act</Label>
                          <Input
                            value={(row.data as GigRow).act || ''}
                            onChange={(e) => handleEditInvalidRow(row.rowIndex, 'act', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Venue</Label>
                          <Input
                            value={(row.data as GigRow).venue || ''}
                            onChange={(e) => handleEditInvalidRow(row.rowIndex, 'venue', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label className="text-xs">Category</Label>
                          <Input
                            value={(row.data as AssetRow).category}
                            onChange={(e) => handleEditInvalidRow(row.rowIndex, 'category', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Manufacturer/Model</Label>
                          <Input
                            value={(row.data as AssetRow).manufacturer_model}
                            onChange={(e) => handleEditInvalidRow(row.rowIndex, 'manufacturer_model', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Acquisition Date</Label>
                          <Input
                            value={(row.data as AssetRow).acquisition_date}
                            onChange={(e) => handleEditInvalidRow(row.rowIndex, 'acquisition_date', e.target.value)}
                            className="h-8 text-sm"
                            placeholder="YYYY-MM-DD"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-xs font-medium text-red-800 mb-1">Errors:</p>
                    <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                      {row.errors.map((error, idx) => (
                        <li key={idx}>
                          <span className="font-medium">{error.field}:</span> {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Valid Rows Table */}
        {validRows.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Valid Rows ({validRows.length})
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    {importType === 'gigs' ? (
                      <>
                        <TableHead>Title</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Act</TableHead>
                        <TableHead>Venue</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead>Category</TableHead>
                        <TableHead>Manufacturer/Model</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Acquisition Date</TableHead>
                        <TableHead>Cost</TableHead>
                      </>
                    )}
                    <TableHead>Import Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validRows.map((row) => (
                    <TableRow key={row.rowIndex}>
                      <TableCell>{row.rowIndex}</TableCell>
                      {importType === 'gigs' ? (
                        <>
                          <TableCell>{(row.data as GigRow).title}</TableCell>
                          <TableCell>{formatDateTimeForPreview((row.data as GigRow).start, (row.data as GigRow).timezone)}</TableCell>
                          <TableCell>{formatDateTimeForPreview((row.data as GigRow).end, (row.data as GigRow).timezone)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{(row.data as GigRow).status}</Badge>
                          </TableCell>
                          <TableCell>{(row.data as GigRow).act || '-'}</TableCell>
                          <TableCell>{(row.data as GigRow).venue || '-'}</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{(row.data as AssetRow).category}</TableCell>
                          <TableCell>{(row.data as AssetRow).manufacturer_model}</TableCell>
                          <TableCell>{(row.data as AssetRow).serial_number || '-'}</TableCell>
                          <TableCell>{(row.data as AssetRow).acquisition_date}</TableCell>
                          <TableCell>{(row.data as AssetRow).cost_per_item || '-'}</TableCell>
                        </>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {row.importStatus === 'pending' && (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm text-yellow-700">Ready</span>
                            </div>
                          )}
                          {row.importStatus === 'importing' && (
                            <div className="flex items-center gap-1">
                              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                              <span className="text-sm text-blue-700">Importing...</span>
                            </div>
                          )}
                          {row.importStatus === 'success' && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-700">Success</span>
                            </div>
                          )}
                          {row.importStatus === 'failed' && (
                            <div className="flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span className="text-sm text-red-700">Failed</span>
                              {row.importError && (
                                <span className="text-xs text-red-600 ml-1" title={row.importError}>
                                  ({row.importError.substring(0, 30)}{row.importError.length > 30 ? '...' : ''})
                                </span>
                              )}
                            </div>
                          )}
                          {!row.importStatus && (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-500">Ready</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

