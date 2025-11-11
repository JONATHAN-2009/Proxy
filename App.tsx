
import React, { useState, useCallback } from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
    <p className="text-lg text-gray-400">Fetching page content...</p>
  </div>
);

const WelcomeMessage: React.FC = () => (
    <div className="text-center text-gray-400 p-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9m-9 9a9 9 0 00-9-9" />
        </svg>
        <h2 className="mt-6 text-2xl font-bold text-gray-300">Welcome to Your Web Proxy</h2>
        <p className="mt-2 text-md">Enter a URL above to begin browsing with your own proxy.</p>
        <p className="mt-4 text-sm text-gray-500">This service can also be used programmatically. Fetch from <code>/api/proxy?url=&lt;your_target_url&gt;</code></p>
    </div>
);

const App: React.FC = () => {
  const [urlInput, setUrlInput] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!urlInput) {
      setError("Please enter a URL.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setHtmlContent('');
    setTargetUrl(null);

    let finalUrl = urlInput;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    const proxyUrl = `/api/proxy?url=${encodeURIComponent(finalUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy request failed: ${errorText || response.statusText}`);
      }
      
      const content = await response.text();
      const origin = new URL(finalUrl).origin;
      const contentWithProxiedUrls = content.replace(/(href|src)=["'](\/(?!\/)[^"']*)["']/g, (match, attr, path) => {
        const proxiedUrl = `/api/proxy?url=${encodeURIComponent(origin + path)}`;
        return `${attr}="${proxiedUrl}"`;
      });

      setHtmlContent(contentWithProxiedUrls);
      setTargetUrl(finalUrl);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [urlInput]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6">
      <div className="w-full max-w-7xl flex flex-col h-[calc(100vh-3rem)]">
        <header className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl font-bold text-blue-400">Web Proxy Browser</h1>
          <p className="text-gray-400 mt-2">Browse the web through your own secure proxy.</p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mb-6 sticky top-4 bg-gray-900/80 backdrop-blur-sm p-3 rounded-xl border border-gray-700 shadow-lg z-10">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            className="flex-grow bg-gray-800 text-white placeholder-gray-500 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            aria-label="URL to browse"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition duration-300 ease-in-out flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              'Go'
            )}
          </button>
        </form>

        <main className="bg-gray-800 border border-gray-700 rounded-lg shadow-inner overflow-hidden flex-grow flex flex-col">
          <div className="p-2 bg-gray-700/50 border-b border-gray-600 text-sm text-gray-400 truncate px-4">
            {targetUrl ? `Viewing: ${targetUrl}` : 'Enter a URL to start'}
          </div>
          <div className="flex-grow flex items-center justify-center overflow-auto relative">
            {isLoading ? (
              <LoadingSpinner />
            ) : error ? (
              <div className="text-center text-red-400 p-6">
                <p className="font-bold text-lg">Error:</p>
                <p className="mt-2 font-mono bg-gray-900 p-4 rounded">{error}</p>
              </div>
            ) : htmlContent ? (
              <iframe
                srcDoc={htmlContent}
                title="Proxy Content"
                className="w-full h-full bg-white border-none"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            ) : (
                <WelcomeMessage />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
