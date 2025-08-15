import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

const MarkdownMessage = ({ content, isError = false, darkMode = false }) => {
  // ใช้ theme context แทน local state
  const { isDarkMode, toggleTheme } = useTheme();
  const [copiedStates, setCopiedStates] = useState({});

  const copyToClipboard = async (text, blockId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [blockId]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [blockId]: false }));
      }, 1500);
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedStates(prev => ({ ...prev, [blockId]: true }));
        setTimeout(() => {
          setCopiedStates(prev => ({ ...prev, [blockId]: false }));
        }, 1500);
      } catch (fallbackErr) {
        console.error('Fallback copy also failed: ', fallbackErr);
      }
    }
  };

  const copyAllContent = async () => {
    try {
      // Strip markdown formatting for plain text copy
      const plainText = content
        .replace(/#{1,6}\s+/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`{3}[\s\S]*?`{3}/g, (match) => {
          // Keep code blocks but remove language specifier
          return match.replace(/`{3}[a-zA-Z]*\n/, '').replace(/`{3}$/, '');
        })
        .replace(/`(.*?)`/g, '$1') // Remove inline code
        .replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1') // Remove links, keep text
        .replace(/^\s*[-*+]\s+/gm, '• ') // Convert list markers to bullets
        .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
        .replace(/^\s*>\s+/gm, '') // Remove blockquote markers
        .trim();
      
      await copyToClipboard(plainText, 'full-content');
    } catch (err) {
      console.error('Failed to copy full content: ', err);
    }
  };

  // Language display names mapping
  const languageDisplayNames = {
    'js': 'JavaScript',
    'jsx': 'React JSX',
    'ts': 'TypeScript',
    'tsx': 'React TSX',
    'py': 'Python',
    'python': 'Python',
    'java': 'Java',
    'c': 'C',
    'cpp': 'C++',
    'cs': 'C#',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'scala': 'Scala',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'Sass',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML',
    'toml': 'TOML',
    'sql': 'SQL',
    'bash': 'Bash',
    'sh': 'Shell',
    'powershell': 'PowerShell',
    'dockerfile': 'Dockerfile',
    'markdown': 'Markdown',
    'md': 'Markdown',
    'r': 'R',
    'matlab': 'MATLAB',
    'perl': 'Perl',
    'lua': 'Lua',
    'vim': 'Vim Script',
    'diff': 'Diff',
    'git': 'Git',
    'graphql': 'GraphQL',
    'terraform': 'Terraform',
    'hcl': 'HCL'
  };

  // Enhanced color schemes with better contrast and visual appeal
  const colorScheme = {
    text: {
      primary: isError
        ? isDarkMode ? "text-red-100" : "text-red-800"
        : isDarkMode ? "text-slate-100" : "text-slate-800",
      secondary: isError
        ? isDarkMode ? "text-red-200" : "text-red-700"
        : isDarkMode ? "text-slate-300" : "text-slate-600",
      accent: isError
        ? isDarkMode ? "text-red-300" : "text-red-600"
        : isDarkMode ? "text-blue-300" : "text-blue-600"
    },
    background: {
      code: isDarkMode 
        ? "bg-slate-900/95 backdrop-blur-sm" 
        : "bg-slate-50/95 backdrop-blur-sm",
      codeInline: isDarkMode
        ? "bg-slate-700/60 backdrop-blur-sm"
        : "bg-slate-100/80 backdrop-blur-sm",
      blockquote: isDarkMode 
        ? "bg-gradient-to-r from-blue-900/10 to-purple-900/10 backdrop-blur-sm" 
        : "bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm",
      table: isDarkMode ? "bg-slate-800/40" : "bg-white/60",
      tableHeader: isDarkMode 
        ? "bg-gradient-to-r from-slate-700 to-slate-800" 
        : "bg-gradient-to-r from-slate-100 to-slate-200"
    },
    border: {
      primary: isDarkMode ? "border-slate-600/50" : "border-slate-200/50",
      accent: isDarkMode ? "border-blue-500/30" : "border-blue-300/50",
      blockquote: isDarkMode ? "border-l-blue-400" : "border-l-blue-500"
    },
    shadow: isDarkMode 
      ? "shadow-lg shadow-black/20" 
      : "shadow-lg shadow-slate-200/60"
  };

  // Error boundary fallback
  if (!content) {
    return (
      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
        <p className="text-sm">No content to display</p>
      </div>
    );
  }

  return (
    <div className={`
      relative text-sm leading-relaxed prose prose-sm max-w-none 
      ${colorScheme.text.primary}
      transition-all duration-300 ease-in-out
    `}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Enhanced Headers with gradient effects
          h1: ({ node, ...props }) => (
            <h1
              className={`
                text-xl font-bold mb-4 mt-6 first:mt-0 
                ${colorScheme.text.primary}
                bg-gradient-to-r from-current to-current/70 bg-clip-text
                border-b-2 ${colorScheme.border.accent} pb-2
                transition-all duration-300 hover:scale-[1.02]
                transform-gpu
              `}
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className={`
                text-lg font-bold mb-3 mt-5 first:mt-0 
                ${colorScheme.text.primary}
                bg-gradient-to-r from-current to-current/80 bg-clip-text
                relative after:content-[''] after:absolute after:bottom-0 after:left-0 
                after:w-8 after:h-0.5 after:bg-gradient-to-r after:from-blue-500 after:to-purple-500
                after:rounded-full after:transition-all after:duration-300
                hover:after:w-16
              `}
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className={`
                text-base font-semibold mb-2 mt-4 first:mt-0 
                ${colorScheme.text.primary}
                relative pl-3 before:content-[''] before:absolute before:left-0 before:top-1/2 
                before:-translate-y-1/2 before:w-1 before:h-4 
                before:bg-gradient-to-b before:from-blue-500 before:to-purple-500
                before:rounded-full
              `}
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              className={`
                text-sm font-medium mb-2 mt-3 first:mt-0 
                ${colorScheme.text.secondary}
                opacity-90
              `}
              {...props}
            />
          ),

          // Enhanced Paragraphs
          p: ({ node, ...props }) => (
            <p className="mb-4 last:mb-0 leading-relaxed text-sm" {...props} />
          ),

          // Beautiful Lists
          ul: ({ node, ...props }) => (
            <ul
              className="mb-4 space-y-2 pl-6 relative"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="mb-4 space-y-2 pl-6 relative"
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li className={`
              text-sm leading-relaxed relative
              before:absolute before:-left-6 before:top-2
              before:w-1.5 before:h-1.5 before:bg-gradient-to-br before:from-blue-500 before:to-purple-500
              before:rounded-full before:shadow-sm
              hover:before:scale-125 before:transition-transform before:duration-200
            `} {...props} />
          ),

          // Enhanced Code blocks - แยกระหว่าง inline และ block code
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const displayName = languageDisplayNames[language.toLowerCase()] || 
                              (language ? language.charAt(0).toUpperCase() + language.slice(1) : 'Code');
            
            // สำหรับ inline code (`ข้อความ`) - แสดงเป็นข้อความปกติ ไม่สร้างบล็อก
            if (inline) {
              return (
                <code
                  className={`
                    ${colorScheme.text.accent} ${colorScheme.background.codeInline}
                    text-[0.85rem] font-mono px-1.5 py-0.5 rounded-md
                    border ${colorScheme.border.primary}
                    transition-all duration-200 hover:scale-105
                    shadow-sm
                  `}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            // สำหรับ code blocks (```language\ncode\n```) - สร้างบล็อกเต็มรูปแบบ
            const codeString = String(children).replace(/\n+$/, '');
            
            // ไม่สร้างบล็อกถ้าไม่มีเนื้อหา
            if (!codeString.trim()) {
              return null;
            }

            // Use a more stable blockId that doesn't change on re-renders
            const blockId = `code-${btoa(encodeURIComponent(codeString.slice(0, 50))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`;

            // Special handling for plain text - show only as red text without block
            if (!language || language.toLowerCase() === 'text') {
              return (
                <span className={`
                  font-mono text-sm
                  ${isDarkMode ? 'text-red-400' : 'text-red-600'}
                `}>
                  {codeString}
                </span>
              );
            }

            return (
              <div className={`
                ${colorScheme.background.code} 
                border ${colorScheme.border.primary}
                rounded-xl my-4 ${colorScheme.shadow}
                relative overflow-hidden group
                hover:scale-[1.005] transition-transform duration-300
              `}>
                {/* Header with language and copy button */}
                <div className="flex justify-between items-center px-4 py-2.5 border-b border-slate-600/20">
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-2 h-2 rounded-full 
                      ${language 
                        ? 'bg-gradient-to-r from-green-400 to-green-500' 
                        : 'bg-gradient-to-r from-slate-400 to-slate-500'
                      }
                    `} />
                    <span className={`text-xs ${colorScheme.text.secondary} font-medium`}>
                      {displayName}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      console.log('Copying code with blockId:', blockId);
                      await copyToClipboard(codeString, blockId);
                    }}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs
                      ${isDarkMode 
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-600/50' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border border-slate-300/50'
                      }
                      transition-all duration-200 hover:scale-105 font-medium
                      ${copiedStates[blockId] ? 'bg-green-600 text-white border-green-500' : ''}
                    `}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d={copiedStates[blockId] ? "M5 13l4 4L19 7" : "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"} 
                      />
                    </svg>
                    <span>{copiedStates[blockId] ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* Syntax highlighted code */}
                <div className="relative">
                  <SyntaxHighlighter
                    language={language || 'text'}
                    style={isDarkMode ? oneDark : oneLight}
                    showLineNumbers={true}
                    lineNumberStyle={{
                      minWidth: '3em',
                      paddingRight: '1em',
                      color: isDarkMode ? '#64748b' : '#94a3b8',
                      fontSize: '0.75rem',
                      textAlign: 'right'
                    }}
                    customStyle={{
                      margin: 0,
                      padding: '1rem',
                      background: 'transparent',
                      fontSize: '0.85rem',
                      lineHeight: '1.5',
                      fontFamily: '"Fira Code", "JetBrains Mono", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace'
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily: '"Fira Code", "JetBrains Mono", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
                        fontSize: '0.85rem'
                      }
                    }}
                    wrapLines={true}
                    wrapLongLines={true}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              </div>
            );
          },

          // Remove the old pre component since we're handling it in code component
          pre: ({ node, children, ...props }) => {
            return <div {...props}>{children}</div>;
          },

          // Elegant Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote
              className={`
                border-l-4 ${colorScheme.border.blockquote} 
                ${colorScheme.background.blockquote}
                pl-6 pr-4 py-4 my-4 italic rounded-r-xl
                ${colorScheme.text.secondary} ${colorScheme.shadow}
                relative overflow-hidden
                before:absolute before:top-2 before:left-2 before:text-6xl before:opacity-10
                before:content-['"'] before:font-serif before:leading-none
                hover:scale-[1.01] transition-all duration-300
              `}
              {...props}
            />
          ),

          // Enhanced Text styling
          strong: ({ node, ...props }) => (
            <strong className={`
              font-bold ${colorScheme.text.primary}
              bg-gradient-to-r from-current to-current/80 bg-clip-text
            `} {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className={`italic ${colorScheme.text.secondary}`} {...props} />
          ),

          // Beautiful Links
          a: ({ node, ...props }) => (
            <a
              className={`image.png
                ${isDarkMode
                  ? "text-blue-400 hover:text-blue-300 decoration-blue-400/50 hover:decoration-blue-300"
                  : "text-blue-600 hover:text-blue-800 decoration-blue-300 hover:decoration-blue-600"
                }
                underline underline-offset-2 decoration-2
                transition-all duration-200 hover:underline-offset-4
                relative hover:scale-105 inline-block
                hover:shadow-lg hover:shadow-blue-500/20
              `}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),

          // Stunning Tables
          table: ({ node, ...props }) => (
            <div className={`
              overflow-hidden mb-6 rounded-xl ${colorScheme.shadow}
              border ${colorScheme.border.primary}
              ${colorScheme.background.table}
              backdrop-blur-sm
            `}>
              <div className="overflow-x-auto">
                <table
                  className="min-w-full"
                  {...props}
                />
              </div>
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              className={`${colorScheme.background.tableHeader}`}
              {...props}
            />
          ),
          th: ({ node, ...props }) => (
            <th
              className={`
                border-b ${colorScheme.border.primary} 
                px-6 py-4 font-semibold text-xs text-left 
                ${colorScheme.text.primary}
                tracking-wider uppercase
              `}
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className={`
                border-b ${colorScheme.border.primary}/30 
                px-6 py-4 text-xs ${colorScheme.text.secondary}
                hover:bg-slate-50/30 dark:hover:bg-slate-700/30
                transition-colors duration-200
              `}
              {...props}
            />
          ),

          // Stylish Horizontal rule
          hr: ({ node, ...props }) => (
            <div className="flex items-center justify-center my-8">
              <hr
                className={`
                  flex-grow ${colorScheme.border.primary} 
                  border-t-0 border-b
                `}
                {...props}
              />
              <div className={`
                mx-4 w-2 h-2 rounded-full 
                bg-gradient-to-r from-blue-500 to-purple-500
                shadow-sm
              `} />
              <hr
                className={`
                  flex-grow ${colorScheme.border.primary} 
                  border-t-0 border-b
                `}
              />
            </div>
          ),

          // Beautiful Images
          img: ({ node, alt, src, ...props }) => (
            <div className="my-6 group">
              <img
                className={`
                  max-w-full h-auto rounded-xl ${colorScheme.shadow}
                  border ${colorScheme.border.primary}
                  transition-all duration-300 group-hover:scale-[1.02]
                  backdrop-blur-sm
                `}
                alt={alt}
                src={src}
                loading="lazy"
                {...props}
              />
              {alt && (
                <p className={`
                  text-center text-xs ${colorScheme.text.secondary} 
                  mt-2 italic opacity-80
                `}>
                  {alt}
                </p>
              )}
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Copy All Content Button */}
      <div className="flex justify-end items-center mt-6">
        <button
          onClick={copyAllContent}
          title={copiedStates['full-content'] ? 'Copied!' : 'Copy All Content'}
          className={`
            flex items-center justify-center w-8 h-8 rounded-full text-xs
            ${isDarkMode 
              ? 'bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white border border-slate-600/30' 
              : 'bg-slate-100/80 hover:bg-slate-200 text-slate-600 hover:text-slate-800 border border-slate-300/30'
            }
            transition-all duration-200 hover:scale-110 
            ${copiedStates['full-content'] ? 'bg-green-600 text-white border-green-500 scale-110' : ''}
            shadow-md hover:shadow-lg backdrop-blur-sm
          `}
        >
          {copiedStates['full-content'] ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2v0a2 2 0 01-2-2V9.828a1 1 0 00-.293-.707L13.172 5H10a1 1 0 00-1 1v1M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default MarkdownMessage;