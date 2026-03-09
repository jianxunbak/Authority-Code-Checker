import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ResponseDisplay({ data }) {
    const [selectedClause, setSelectedClause] = useState(null);

    if (!data) return null;

    return (
        <div className="response-card fade-in">
            <div className="response-header">
                <div className="response-source">
                    <span className="badge-source">Source: {data.source_department}</span>
                </div>
                <div className="response-confidence">
                    <span className="label">Confidence:</span>
                    <span className="score-text">{(data.confidence_score * 100).toFixed(0)}%</span>
                </div>
                {data.retrieval_source && (
                    <div className="response-source-type">
                        <span className={`badge-rag ${data.retrieval_status && data.retrieval_status.includes("Limited") ? "rag-warning" : "rag-success"}`}>
                            {data.retrieval_source}
                        </span>
                    </div>
                )}
            </div>

            <div className="response-body">
                <h4>Authority Agent Response</h4>
                <div className="response-text">
                    <ReactMarkdown>{data.answer}</ReactMarkdown>
                </div>

                {data.related_rules && data.related_rules.length > 0 && (
                    <div className="related-rules">
                        <h5>📚 Relevant Clauses found in Knowledge Base:</h5>
                        <div className="clauses-grid">
                            {data.related_rules.map((rule, idx) => {
                                const isObj = typeof rule === 'object' && rule !== null;
                                const code = isObj ? rule.code : rule;
                                const text = isObj ? rule.text : "";
                                const page = isObj ? rule.page : null;

                                return (
                                    <div
                                        key={idx}
                                        className="clause-card"
                                        onClick={() => setSelectedClause({ code, text, page })}
                                    >
                                        <div className="clause-header">
                                            <span className="clause-code">{code}</span>
                                            {page && <span className="clause-ref">Ref: {page}</span>}
                                        </div>
                                        <div className="clause-preview">"{text}"</div>
                                        <div className="read-more-hint">👆 Click to read full text</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {selectedClause && (
                <div className="modal-overlay" onClick={() => setSelectedClause(null)}>
                    <div className="clause-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="clause-modal-header">
                            <h2>{selectedClause.code}</h2>
                            <button className="close-btn" onClick={() => setSelectedClause(null)}>&times;</button>
                        </div>
                        <div className="clause-modal-body">
                            {selectedClause.text}
                        </div>
                        <div className="clause-modal-footer">
                            <button className="btn-secondary" onClick={() => setSelectedClause(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
