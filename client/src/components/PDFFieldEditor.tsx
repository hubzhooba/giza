import { useState, useRef, useEffect, useCallback } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  Type, Square, Calendar, CheckSquare, Move, Trash2, 
  Save, Download, User, Mail, FileSignature 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFField {
  id: string;
  type: 'text' | 'signature' | 'date' | 'checkbox';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  assignedTo?: string;
  assignedEmail?: string;
  label?: string;
  required: boolean;
  value?: string;
}

interface PDFFieldEditorProps {
  pdfData: string;
  roomId: string;
  participants: Array<{ email: string; name: string; role: string }>;
  onSave: (fields: PDFField[], pdfData: Uint8Array) => void;
}

export default function PDFFieldEditor({ pdfData, roomId, participants, onSave }: PDFFieldEditorProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [fields, setFields] = useState<PDFField[]>([]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);
  const [pageScale, setPageScale] = useState(1);
  const pageRef = useRef<HTMLDivElement>(null);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });

  const fieldTools = [
    { id: 'text', icon: Type, label: 'Text Field', color: 'bg-blue-100 border-blue-300' },
    { id: 'signature', icon: FileSignature, label: 'Signature', color: 'bg-purple-100 border-purple-300' },
    { id: 'date', icon: Calendar, label: 'Date', color: 'bg-green-100 border-green-300' },
    { id: 'checkbox', icon: CheckSquare, label: 'Checkbox', color: 'bg-yellow-100 border-yellow-300' },
  ];

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onPageLoadSuccess = useCallback((page: any) => {
    const viewport = page.getViewport({ scale: 1 });
    setPdfDimensions({ width: viewport.width, height: viewport.height });
  }, []);

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedTool || !pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / pageScale;
    const y = (e.clientY - rect.top) / pageScale;

    const newField: PDFField = {
      id: uuidv4(),
      type: selectedTool as PDFField['type'],
      page: pageNumber,
      x,
      y,
      width: selectedTool === 'checkbox' ? 20 : 200,
      height: selectedTool === 'checkbox' ? 20 : 40,
      required: true,
      label: `${selectedTool.charAt(0).toUpperCase() + selectedTool.slice(1)} Field`,
    };

    setFields([...fields, newField]);
    setSelectedTool(null);
  };

  const handleFieldDragStart = (fieldId: string) => {
    setDraggedField(fieldId);
  };

  const handleFieldDragEnd = (e: React.DragEvent<HTMLDivElement>, fieldId: string) => {
    if (!pageRef.current) return;

    const rect = pageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / pageScale;
    const y = (e.clientY - rect.top) / pageScale;

    setFields(fields.map(field => 
      field.id === fieldId 
        ? { ...field, x, y }
        : field
    ));
    setDraggedField(null);
  };

  const handleFieldResize = (fieldId: string, width: number, height: number) => {
    setFields(fields.map(field => 
      field.id === fieldId 
        ? { ...field, width, height }
        : field
    ));
  };

  const deleteField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
    setSelectedField(null);
  };

  const assignFieldToSigner = (fieldId: string, email: string) => {
    const participant = participants.find(p => p.email === email);
    if (!participant) return;

    setFields(fields.map(field => 
      field.id === fieldId 
        ? { ...field, assignedTo: participant.name, assignedEmail: email }
        : field
    ));
  };

  const saveFieldsAndDocument = async () => {
    try {
      // Load the PDF
      const existingPdfBytes = await fetch(pdfData).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // Add field metadata as PDF annotations (for visualization)
      fields.forEach(field => {
        const pages = pdfDoc.getPages();
        const page = pages[field.page - 1];
        
        // Draw field boundary
        page.drawRectangle({
          x: field.x,
          y: page.getHeight() - field.y - field.height,
          width: field.width,
          height: field.height,
          borderColor: rgb(0.2, 0.2, 0.8),
          borderWidth: 1,
          opacity: 0.3,
        });
      });

      const pdfBytes = await pdfDoc.save();
      onSave(fields, pdfBytes);
      toast.success('Fields saved successfully!');
    } catch (error) {
      toast.error('Failed to save fields');
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text': return Type;
      case 'signature': return FileSignature;
      case 'date': return Calendar;
      case 'checkbox': return CheckSquare;
      default: return Type;
    }
  };

  const getFieldColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-100 border-blue-400';
      case 'signature': return 'bg-purple-100 border-purple-400';
      case 'date': return 'bg-green-100 border-green-400';
      case 'checkbox': return 'bg-yellow-100 border-yellow-400';
      default: return 'bg-gray-100 border-gray-400';
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Tools */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Field Tools</h3>
        <div className="space-y-2 mb-6">
          {fieldTools.map(tool => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={`w-full flex items-center p-3 rounded-lg border-2 transition ${
                  selectedTool === tool.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span className="text-sm font-medium">{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Fields List */}
        <h3 className="font-semibold text-gray-900 mb-4">Document Fields</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {fields.filter(f => f.page === pageNumber).map(field => {
            const Icon = getFieldIcon(field.type);
            return (
              <div
                key={field.id}
                onClick={() => setSelectedField(field.id)}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  selectedField === field.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <Icon className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">{field.label}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteField(field.id);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {field.assignedTo && (
                  <p className="text-xs text-gray-600">
                    Assigned to: {field.assignedTo}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={saveFieldsAndDocument}
          className="w-full btn-primary mt-6 flex items-center justify-center"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Fields
        </button>
      </div>

      {/* Center - PDF Viewer */}
      <div className="flex-1 bg-gray-100 overflow-auto p-4">
        <div className="mb-4 flex items-center justify-between bg-white rounded-lg p-3">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
              disabled={pageNumber <= 1}
              className="px-3 py-1 text-sm btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pageNumber} of {numPages || '...'}
            </span>
            <button
              onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
              disabled={pageNumber >= (numPages || 1)}
              className="px-3 py-1 text-sm btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="text-sm text-gray-600">
            {selectedTool ? `Click to place ${selectedTool} field` : 'Select a tool to add fields'}
          </div>
        </div>

        <div className="flex justify-center">
          <div 
            ref={pageRef}
            className="relative bg-white shadow-lg"
            onClick={handlePageClick}
            style={{ cursor: selectedTool ? 'crosshair' : 'default' }}
          >
            <Document
              file={pdfData}
              onLoadSuccess={onDocumentLoadSuccess}
            >
              <Page
                pageNumber={pageNumber}
                width={600}
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer={true}
                renderAnnotationLayer={false}
              />
            </Document>

            {/* Render Fields */}
            {fields
              .filter(field => field.page === pageNumber)
              .map(field => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => handleFieldDragStart(field.id)}
                  onDragEnd={(e) => handleFieldDragEnd(e, field.id)}
                  className={`absolute border-2 rounded cursor-move ${getFieldColor(field.type)} ${
                    selectedField === field.id ? 'ring-2 ring-primary-500' : ''
                  }`}
                  style={{
                    left: `${field.x * pageScale}px`,
                    top: `${field.y * pageScale}px`,
                    width: `${field.width * pageScale}px`,
                    height: `${field.height * pageScale}px`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedField(field.id);
                  }}
                >
                  <div className="flex items-center justify-between p-1 text-xs">
                    <span className="font-medium truncate">{field.label}</span>
                    <Move className="w-3 h-3" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Field Properties */}
      {selectedField && (
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Field Properties</h3>
          {(() => {
            const field = fields.find(f => f.id === selectedField);
            if (!field) return null;

            return (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Label
                  </label>
                  <input
                    type="text"
                    value={field.label || ''}
                    onChange={(e) => {
                      setFields(fields.map(f => 
                        f.id === field.id 
                          ? { ...f, label: e.target.value }
                          : f
                      ));
                    }}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned To
                  </label>
                  <select
                    value={field.assignedEmail || ''}
                    onChange={(e) => assignFieldToSigner(field.id, e.target.value)}
                    className="input"
                  >
                    <option value="">Select signer...</option>
                    {participants
                      .filter(p => p.role === 'signer')
                      .map(p => (
                        <option key={p.email} value={p.email}>
                          {p.name} ({p.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => {
                        setFields(fields.map(f => 
                          f.id === field.id 
                            ? { ...f, required: e.target.checked }
                            : f
                        ));
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Required field</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Width
                    </label>
                    <input
                      type="number"
                      value={field.width}
                      onChange={(e) => handleFieldResize(field.id, Number(e.target.value), field.height)}
                      className="input"
                      min="50"
                      max="500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height
                    </label>
                    <input
                      type="number"
                      value={field.height}
                      onChange={(e) => handleFieldResize(field.id, field.width, Number(e.target.value))}
                      className="input"
                      min="20"
                      max="200"
                    />
                  </div>
                </div>

                <button
                  onClick={() => deleteField(field.id)}
                  className="w-full flex items-center justify-center text-red-600 hover:text-red-700 py-2 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Field
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}