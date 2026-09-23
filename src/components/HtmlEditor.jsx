import React, { useRef, useEffect } from 'react';

export default function HtmlEditor({ value, onChange, placeholder = '구체적인 요청 사항, 발생 경로, 수정 요구사항 등을 상세히 적어주세요.' }) {
  const editorRef = useRef(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      if (!isInternalChange.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const exec = (command, val = null) => {
    document.execCommand(command, false, val);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  return (
    <div className="html-editor-container" style={{
      border: '1px solid var(--border-color)',
      background: 'var(--bg-input)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '0.45rem 0.65rem',
        background: 'var(--bg-card-hover)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <button
          type="button"
          onClick={() => exec('bold')}
          title="굵게 (Bold)"
          style={toolbarBtnStyle}
          className="editor-btn"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => exec('italic')}
          title="기울임 (Italic)"
          style={toolbarBtnStyle}
          className="editor-btn"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => exec('underline')}
          title="밑줄 (Underline)"
          style={toolbarBtnStyle}
          className="editor-btn"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={() => exec('strikeThrough')}
          title="취소선"
          style={toolbarBtnStyle}
          className="editor-btn"
        >
          <s>S</s>
        </button>

        <span style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }} />

        <button
          type="button"
          onClick={() => exec('formatBlock', '<h2>')}
          title="대제목 (H2)"
          style={{ ...toolbarBtnStyle, fontSize: '13px', fontWeight: 600 }}
          className="editor-btn"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => exec('formatBlock', '<h3>')}
          title="소제목 (H3)"
          style={{ ...toolbarBtnStyle, fontSize: '13px', fontWeight: 600 }}
          className="editor-btn"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => exec('formatBlock', '<p>')}
          title="본문 문단"
          style={{ ...toolbarBtnStyle, fontSize: '12px' }}
          className="editor-btn"
        >
          본문
        </button>

        <span style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }} />

        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          title="글머리 기호 목록"
          style={toolbarBtnStyle}
          className="editor-btn"
        >
          • 목록
        </button>
        <button
          type="button"
          onClick={() => exec('insertOrderedList')}
          title="번호 매기기 목록"
          style={toolbarBtnStyle}
          className="editor-btn"
        >
          1. 목록
        </button>
        <button
          type="button"
          onClick={() => exec('formatBlock', '<blockquote>')}
          title="인용구"
          style={toolbarBtnStyle}
          className="editor-btn"
        >
          ❝
        </button>
        <button
          type="button"
          onClick={() => exec('insertHorizontalRule')}
          title="구분선"
          style={toolbarBtnStyle}
          className="editor-btn"
        >
          ―
        </button>

        <span style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }} />

        <button
          type="button"
          onClick={() => exec('removeFormat')}
          title="서식 지우기"
          style={{ ...toolbarBtnStyle, fontSize: '12px' }}
          className="editor-btn"
        >
          서식 제거
        </button>
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="html-editor-content"
        style={{
          minHeight: '200px',
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '1rem 1.25rem',
          outline: 'none',
          fontSize: '15px',
          lineHeight: 1.7,
          color: 'var(--text-primary)',
          background: 'transparent'
        }}
      />
    </div>
  );
}

const toolbarBtnStyle = {
  background: 'none',
  border: 'none',
  padding: '4px 8px',
  cursor: 'pointer',
  fontSize: '14px',
  color: 'var(--text-primary)',
  borderRadius: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s ease'
};
