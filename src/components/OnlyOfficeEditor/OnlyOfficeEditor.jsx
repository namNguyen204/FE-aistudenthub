
import React, { useEffect, useRef, useState } from 'react';
import documentService from '../../services/document.service';

const OnlyOfficeEditor = ({ documentId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const editorRef = useRef(null);
  const containerId = `onlyoffice-editor-${documentId}`;
  useEffect(() => {
    if (!documentId || documentId === 'undefined') {
      return;
    }
    let isMounted = true;
    const initEditor = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Lấy cấu hình và token JWT từ Backend
        const configData = await documentService.getOnlyOfficeConfig(documentId);
        if (!isMounted || !configData) return;

        const { docserviceUrl, token, documentType, document: onlyOfficeDoc, editorConfig } = configData;

        // 2. Load động file script api.js của OnlyOffice từ VPS
        const loadScript = () => {
          return new Promise((resolve, reject) => {
            if (window.DocsAPI) {
              resolve();
              return;
            }
            const existingScript = document.getElementById('onlyoffice-api-script');
            if (existingScript) {
              existingScript.onload = () => resolve();
              existingScript.onerror = () => reject(new Error('Không thể tải script OnlyOffice API'));
              return;
            }
            const script = document.createElement('script');
            script.id = 'onlyoffice-api-script';
            script.src = docserviceUrl;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Không thể kết nối tới server OnlyOffice VPS'));
            document.head.appendChild(script);
          });
        };

        await loadScript();
        if (!isMounted) return;

        // 3. Khởi tạo trình soạn thảo OnlyOffice
        if (window.DocsAPI && window.DocsAPI.DocEditor) {
          if (editorRef.current && typeof editorRef.current.destroyEditor === 'function') {
            try {
              editorRef.current.destroyEditor();
            } catch (e) {
              console.warn('Destroying previous instance failed', e);
            }
          }
          const editorProps = {
            type: 'desktop',
            width: '100%',
            height: '100%',
            documentType: documentType || 'word',
            document: onlyOfficeDoc,
            editorConfig: editorConfig,
            token: token
          };
          editorRef.current = new window.DocsAPI.DocEditor(containerId, editorProps);
          setLoading(false);
        } else {
          throw new Error('DocsAPI chưa sẵn sàng');
        }
      } catch (err) {
        console.error('OnlyOffice init error:', err);
        if (isMounted) {
          setError(err.message || 'Không thể tải bộ soạn thảo OnlyOffice');
          setLoading(false);
        }
      }
    };

    initEditor();

    return () => {
      isMounted = false;
      if (editorRef.current && typeof editorRef.current.destroyEditor === 'function') {
        try {
          editorRef.current.destroyEditor();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [documentId]);

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#dc2626',
        backgroundColor: '#fef2f2',
        borderRadius: '8px',
        margin: '1rem'
      }}>
        <h4>⚠️ Lỗi Tải Trình Soạn Thảo OnlyOffice</h4>
        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#991b1b' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', flex: 1, minHeight: 0 }}>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          backgroundColor: '#ffffff', zIndex: 10, color: '#2563eb', fontWeight: 500
        }}>
          Đang kết nối tới trình soạn thảo OnlyOffice VPS...
        </div>
      )}
      <div id={containerId} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default OnlyOfficeEditor;
