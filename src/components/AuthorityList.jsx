import { useState } from 'react';

const PdfIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ minWidth: '20px' }}>
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2V8H20" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 13H8" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 17H8" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 9H9H8" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function AuthorityList({ authorities = [], onManageClick }) {
    const [expandedAuth, setExpandedAuth] = useState({});

    const toggleAuth = (authName) => {
        setExpandedAuth(prev => ({
            ...prev,
            [authName]: !prev[authName]
        }));
    };

    // Group files by Authority
    const grouped = authorities.reduce((acc, item) => {
        const authName = item.authority || "Unknown";
        if (!acc[authName]) acc[authName] = [];
        acc[authName].push(item);
        return acc;
    }, {});

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' });
    };

    const getAuthorityIcon = (name) => {
        const n = name.toUpperCase().replace(/[^A-Z]/g, ''); // Clean name

        // Attempt to construct the path.
        // Note: In Vite, dynamic imports with template literals work if they match a pattern.
        // However, a simpler way for fixed assets is using the public folder or explicit imports.
        // Since we moved them to src/assets, let's try the URL ID idiom which is standard in Vite.

        const logoPath = new URL(`../assets/Authority_icon/${n}.png`, import.meta.url).href;

        return (
            <div className="auth-logo-wrapper">
                <img
                    src={logoPath}
                    alt={n}
                    className="auth-logo-img"
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
                {/* Fallback Badge (Hidden by default, shown on error) */}
                <span
                    className="auth-logo-fallback"
                    style={{
                        display: 'none',
                        backgroundColor:
                            n.includes("URA") ? '#ef4444' :
                                n.includes("BCA") ? '#3b82f6' :
                                    n.includes("SCDF") ? '#f97316' :
                                        n.includes("LTA") ? '#10b981' :
                                            n.includes("NEA") ? '#06b6d4' :
                                                n.includes("PUB") ? '#0ea5e9' : '#64748b'
                    }}
                >
                    {n.substring(0, 3)}
                </span>
            </div>
        );
    };

    return (
        <div className="authority-list-container">
            <div className="list-header-row">
                <h3>Knowledge Base</h3>
                <button className="add-btn" onClick={onManageClick} title="Manage Knowledge Base">
                    +
                </button>
            </div>

            <div className="authority-groups">
                {Object.keys(grouped).map((authName) => {
                    const isExpanded = !!expandedAuth[authName];

                    return (
                        <div key={authName} className={`authority-group ${isExpanded ? 'expanded' : ''}`}>
                            <div
                                className="group-header clickable"
                                onClick={() => toggleAuth(authName)}
                            >
                                <div className="header-left">
                                    {getAuthorityIcon(authName)}
                                    <span className="auth-name">{authName}</span>
                                    <span className="file-count">({grouped[authName].length})</span>
                                </div>
                                <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                            </div>

                            {isExpanded && (
                                <ul className="file-list fade-in">
                                    {grouped[authName].map((file, idx) => (
                                        <li key={idx}>
                                            {file.fileUrl ? (
                                                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="doc-card">
                                                    <div className="doc-info">
                                                        <PdfIcon />
                                                        <span className="doc-name" title={file.fileName}>{file.fileName}</span>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="doc-card disabled">
                                                    <div className="doc-info">
                                                        <PdfIcon />
                                                        <span className="doc-name">{file.fileName}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
