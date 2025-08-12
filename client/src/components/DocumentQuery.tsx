import { useState, useEffect } from 'react';
import { Search, FileText, Cloud, Calendar, User, Tag } from 'lucide-react';
import { arweaveWalletStorage } from '@/lib/arweave-wallet-storage';
import { useStore } from '@/store/useStore';
import { handleStoarError } from '@/lib/stoar-error-handler';
import toast from 'react-hot-toast';
import { useArConnect } from '@/contexts/ArConnectContext';

interface DocumentQueryProps {
  roomId?: string;
  userId?: string;
  onDocumentSelect?: (doc: any) => void;
}

interface FilterOptions {
  roomId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  documentType?: string;
  limit: number;
}

export default function DocumentQuery({ roomId, userId, onDocumentSelect }: DocumentQueryProps) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    roomId,
    userId,
    limit: 20
  });
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { user, rooms } = useStore();
  const { isConnected } = useArConnect();

  // Initialize STOAR when wallet is connected
  useEffect(() => {
    const initStoar = async () => {
      if (isConnected) {
        await arweaveWalletStorage.init();
        setIsInitialized(arweaveWalletStorage.getIsInitialized());
      } else {
        setIsInitialized(false);
      }
    };

    initStoar();
  }, [isConnected]);

  const searchDocuments = async (append = false) => {
    if (!isInitialized) {
      toast.error('Document query is not available. Please check your wallet connection.');
      return;
    }
    
    setLoading(true);
    
    try {
      const queryOptions: any = {
        limit: filters.limit,
        after: append ? cursor : undefined
      };

      // Add filters
      if (filters.roomId) {
        queryOptions.roomId = filters.roomId;
      }
      if (filters.userId) {
        queryOptions.userId = filters.userId;
      }

      const queryResults = await arweaveWalletStorage.queryDocuments(queryOptions) || [];
      
      if (append) {
        setResults(prev => [...prev, ...queryResults]);
      } else {
        setResults(queryResults);
      }
      
      setHasMore(queryResults.length === filters.limit);
      
      if (queryResults.length > 0) {
        const lastResult = queryResults[queryResults.length - 1];
        setCursor(lastResult.id);
      }
      
      toast.success(`Found ${queryResults.length} documents`);
    } catch (error) {
      handleStoarError(error, { operation: 'query' });
    } finally {
      setLoading(false);
    }
  };

  // Initial search
  useEffect(() => {
    if (isInitialized) {
      searchDocuments();
    }
  }, [isInitialized, filters.roomId, filters.userId]);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString();
  };

  const formatFileSize = (tags: Record<string, string>) => {
    const size = tags['Content-Length'];
    if (!size) return 'Unknown size';
    
    const bytes = parseInt(size);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTagValue = (tags: Record<string, string>, key: string) => {
    return tags[key] || 'Unknown';
  };

  if (!isInitialized) {
    return (
      <div className="card glossy">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing STOAR service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card glossy">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
          Document Archive
        </h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary text-sm"
        >
          <Search className="w-4 h-4 mr-2" />
          {showFilters ? 'Hide' : 'Show'} Filters
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room
              </label>
              <select
                value={filters.roomId || ''}
                onChange={(e) => setFilters({ ...filters, roomId: e.target.value || undefined })}
                className="input"
              >
                <option value="">All Rooms</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Results per page
              </label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                className="input"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={() => searchDocuments()}
            disabled={loading}
            className="btn-primary w-full"
          >
            <Search className="w-4 h-4 mr-2" />
            Search Documents
          </button>
        </div>
      )}

      <div className="space-y-3">
        {loading && results.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Searching Arweave...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-8">
            <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No documents found</p>
            <p className="text-sm text-gray-500 mt-2">
              Try adjusting your filters or upload some documents
            </p>
          </div>
        ) : (
          <>
            {results.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border border-white/30 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all cursor-pointer"
                onClick={() => onDocumentSelect?.(doc)}
              >
                <div className="flex items-center flex-1">
                  <FileText className="w-8 h-8 text-primary-600 mr-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {getTagValue(doc.tags, 'File-Name')}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(doc.block?.timestamp)}
                      </span>
                      <span className="flex items-center">
                        <Tag className="w-3 h-3 mr-1" />
                        {getTagValue(doc.tags, 'Content-Type')}
                      </span>
                      {doc.tags['Encrypted'] === 'true' && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          Encrypted
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Cloud className="w-4 h-4 text-green-600" />
                  <a
                    href={`https://arweave.net/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    View on Arweave
                  </a>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <button
                onClick={() => searchDocuments(true)}
                disabled={loading}
                className="w-full py-3 text-center text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600 text-center">
          Showing {results.length} documents
          {hasMore && ' (more available)'}
        </div>
      )}
    </div>
  );
}