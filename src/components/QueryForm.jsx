import React, { useState } from 'react';

export default function QueryForm({ onSearch, isLoading }) {
    const [query, setQuery] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query);
        }
    };

    return (
        <div className="query-section">
            <form onSubmit={handleSubmit} className="query-form">
                <label htmlFor="query-input" className="query-label">
                    Ask about Singapore Authority Codes
                </label>
                <div className="input-group">
                    <input
                        id="query-input"
                        type="text"
                        className="query-input"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g., What is the setback requirement for a landed property?"
                        disabled={isLoading}
                        autoComplete="off"
                    />
                    <button type="submit" className="submit-btn" disabled={isLoading}>
                        {isLoading ? (
                            <span className="spinner"></span>
                        ) : (
                            <span>Analyse with Gemini</span>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
