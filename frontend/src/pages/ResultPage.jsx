import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GraphViewer from '../components/GraphViewer';

const LAYER_INFO = {
    0: { label: 'DOCUMENT', desc: 'This is the root document. All topics and details are extracted from this source.' },
    1: { label: 'TOPIC',    desc: 'A core topic identified by the AI from the document content.' },
    2: { label: 'DETAIL',   desc: 'A supporting detail or sub-concept linked to its parent topic.' },
};

const ResultPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedNode, setSelectedNode] = useState(null);
    
    const concepts = location.state?.concepts || [];
    const filename = location.state?.filename || "Analysis Result";

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
            <GraphViewer 
                fullScreen={true} 
                concepts={concepts} 
                rootName={filename}
                onNodeClick={(node) => setSelectedNode(node)}
            />

            {/* Back Button */}
            <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100 }}>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="glow-button"
                    style={{ padding: '10px 20px', width: 'auto' }}
                >
                    ← Back to Explorer
                </button>
            </div>

            {/* Title Badge */}
            <div style={{
                position: 'absolute', top: '20px', right: selectedNode ? '310px' : '20px',
                zIndex: 100, padding: '10px 20px',
                background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)',
                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                transition: 'right 0.3s ease'
            }}>
                <h3 style={{ margin: 0, fontSize: '14px' }}>
                    Concept Map: {filename.length > 30 ? filename.substring(0, 27) + "..." : filename}
                </h3>
            </div>

            {/* ── Node Detail Sidebar ── */}
            {selectedNode && (
                <div style={{
                    position: 'absolute', top: 0, right: 0,
                    width: '290px', height: '100%',
                    background: 'rgba(10, 15, 30, 0.92)',
                    backdropFilter: 'blur(24px)',
                    borderLeft: '1px solid rgba(99,102,241,0.25)',
                    padding: '80px 24px 24px',
                    color: 'white', zIndex: 90,
                    overflowY: 'auto',
                    boxShadow: '-10px 0 40px rgba(0,0,0,0.4)',
                }}>
                    {/* Close button */}
                    <button 
                        onClick={() => setSelectedNode(null)}
                        style={{
                            position: 'absolute', top: 24, right: 20,
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#94a3b8', fontSize: 18, cursor: 'pointer',
                            borderRadius: 8, width: 36, height: 36,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >✕</button>

                    {/* Layer Badge */}
                    <div style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 700,
                        color: '#6366f1', letterSpacing: 2,
                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 6, padding: '4px 10px', marginBottom: 14
                    }}>
                        {LAYER_INFO[selectedNode.level]?.label ?? 'NODE'}
                    </div>

                    {/* Node Name */}
                    <h2 style={{ fontSize: 20, margin: '0 0 14px', lineHeight: 1.4, color: '#f1f5f9' }}>
                        {selectedNode.name}
                    </h2>

                    {/* Divider */}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />

                    {/* Description */}
                    <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.75, margin: 0 }}>
                        {LAYER_INFO[selectedNode.level]?.desc}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ResultPage;

