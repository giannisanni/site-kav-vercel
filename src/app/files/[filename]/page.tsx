'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import * as XLSX from 'sheetjs-style';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function File({ params }: { params: Promise<{ filename: string }> }) {
  const [fileContent, setFileContent] = useState<string | ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber] = useState(1);
  const [filename, setFilename] = useState<string>('');

  useEffect(() => {
    const fetchFile = async () => {
      const resolvedParams = await params;
      const paramFilename = resolvedParams.filename;
      setFilename(paramFilename);
      
      const res = await fetch(`/files/${paramFilename}`);
      const extension = paramFilename.split('.').pop()?.toLowerCase();

      if (extension === 'pdf' || extension === 'xlsx' || extension === 'pptx' || extension === 'docx') {
        const arrayBuffer = await res.arrayBuffer();
        setFileContent(arrayBuffer);
      } else {
        const text = await res.text();
        setFileContent(text);
      }
    };

    fetchFile();
  }, [params]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleDownload = () => {
    if (fileContent) {
      const blob = new Blob([fileContent], { type: 'application/octet-stream' });
      saveAs(blob, filename);
    }
  };

  const renderFile = () => {
    if (!fileContent) return <div>Loading...</div>;

    const extension = params.filename.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      return (
        <div>
          <Document file={fileContent} onLoadSuccess={onDocumentLoadSuccess}>
            {Array.from(new Array(numPages), (el, index) => (
              <Page key={`page_${index + 1}`} pageNumber={index + 1} />
            ))}
          </Document>
          <p>
            Page {pageNumber} of {numPages}
          </p>
        </div>
      );
    } else if (extension === 'xlsx') {
      const workbook = XLSX.read(fileContent, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const html = XLSX.utils.sheet_to_html(worksheet);
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    } else if (extension === 'docx') {
      mammoth.convertToHtml({ arrayBuffer: fileContent as ArrayBuffer })
        .then((result) => {
          const el = document.getElementById('docx-container');
          if (el) el.innerHTML = result.value;
        })
        .catch((err) => console.error('Error converting docx:', err));
      return <div id="docx-container" />;
    } else {
      return <pre>{fileContent}</pre>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">{filename}</h1>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Download
          </button>
        </div>
        <div>{renderFile()}</div>
      </div>
    </div>
  );
}