import { useState } from 'react';

export default function KnowledgeManager({
    authorities,
    onAddAuthority,
    onUpdateAuthority,
    onClose
}) {
    const [activeTab, setActiveTab] = useState('update');
    const [selectedAuth, setSelectedAuth] = useState('');
    const [newAuthName, setNewAuthName] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    const uniqueAuthorities = [...new Set(authorities.map(a => a.authority || "Unknown"))].sort();

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedAuth || !file) return;
        setUploading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        onUpdateAuthority(selectedAuth, file);
        setUploading(false);
        setStatusMsg(`Updated ${selectedAuth}`);
        setFile(null);
        setTimeout(() => setStatusMsg(''), 3000);
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newAuthName || !file) return;
        setUploading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        onAddAuthority(newAuthName, file);
        setUploading(false);
        setStatusMsg(`Added ${newAuthName}`);
        setNewAuthName('');
        setFile(null);
        setTimeout(() => setStatusMsg(''), 3000);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content sleek-modal">
                <div className="sleek-header">
                    <h3>Manage Knowledge Base</h3>
                    <button className="sleek-close" onClick={onClose}>&times;</button>
                </div>

                <div className="sleek-tabs">
                    <button
                        className={`sleek-tab ${activeTab === 'update' ? 'active' : ''}`}
                        onClick={() => setActiveTab('update')}
                    >
                        Update Code
                    </button>
                    <button
                        className={`sleek-tab ${activeTab === 'add' ? 'active' : ''}`}
                        onClick={() => setActiveTab('add')}
                    >
                        Add New Authority
                    </button>
                </div>

                <div className="sleek-body">
                    {activeTab === 'update' ? (
                        <form onSubmit={handleUpdate} className="sleek-form">
                            <div className="sleek-field">
                                <label>Authority</label>
                                <div className="select-wrapper">
                                    <select
                                        value={selectedAuth}
                                        onChange={(e) => setSelectedAuth(e.target.value)}
                                        required
                                        className="sleek-input"
                                    >
                                        <option value="">Select an authority...</option>
                                        {uniqueAuthorities.map((auth, i) => (
                                            <option key={i} value={auth}>{auth}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="sleek-field">
                                <label>Document</label>
                                <label className={`sleek-dropzone ${file ? 'has-file' : ''}`}>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".pdf"
                                        required
                                        className="hidden-file-input"
                                    />
                                    {file ? (
                                        <div className="file-preview">
                                            <span className="file-icon">📄</span>
                                            <span className="file-name">{file.name}</span>
                                            <span className="change-link">Change</span>
                                        </div>
                                    ) : (
                                        <span className="drop-hint">Click to upload PDF code file</span>
                                    )}
                                </label>
                            </div>

                            <button type="submit" className="sleek-btn" disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Update Code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleAdd} className="sleek-form">
                            <div className="sleek-field">
                                <label>Authority Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. SDC"
                                    value={newAuthName}
                                    onChange={(e) => setNewAuthName(e.target.value)}
                                    required
                                    className="sleek-input"
                                />
                            </div>

                            <div className="sleek-field">
                                <label>Document</label>
                                <label className={`sleek-dropzone ${file ? 'has-file' : ''}`}>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".pdf"
                                        required
                                        className="hidden-file-input"
                                    />
                                    {file ? (
                                        <div className="file-preview">
                                            <span className="file-icon">📄</span>
                                            <span className="file-name">{file.name}</span>
                                            <span className="change-link">Change</span>
                                        </div>
                                    ) : (
                                        <span className="drop-hint">Click to upload PDF code file</span>
                                    )}
                                </label>
                            </div>

                            <button type="submit" className="sleek-btn" disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Add Authority'}
                            </button>
                        </form>
                    )}

                    {statusMsg && <div className="sleek-status">{statusMsg}</div>}
                </div>
            </div>
        </div>
    );
}
