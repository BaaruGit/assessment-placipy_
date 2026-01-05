import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  type?: 'assessment' | 'mcq' | 'coding' | 'header';
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'assessment', count = 1 }) => {
  const renderSkeleton = (index: number) => {
    switch (type) {
      case 'header':
        return (
          <div className="skeleton-loader" key={index}>
            <div className="skeleton-header">
              <div className="skeleton-timer"></div>
              <div className="skeleton-header-controls">
                <div className="skeleton-btn"></div>
                <div className="skeleton-btn"></div>
                <div className="skeleton-language-selector"></div>
                <div className="skeleton-btn"></div>
                <div className="skeleton-btn"></div>
              </div>
            </div>
          </div>
        );
      
      case 'mcq':
        return (
          <div className="skeleton-loader" key={index}>
            <div className="skeleton-section">
              <div className="skeleton-title"></div>
              <div className="skeleton-content"></div>
              <div className="skeleton-content-medium"></div>
              <div className="skeleton-content-short"></div>
              
              <div className="skeleton-options">
                <div className="skeleton-option"></div>
                <div className="skeleton-option"></div>
                <div className="skeleton-option"></div>
                <div className="skeleton-option"></div>
              </div>
              
              <div className="skeleton-progress"></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <div className="skeleton-nav-btn"></div>
                <div className="skeleton-nav-btn"></div>
              </div>
            </div>
          </div>
        );
      
      case 'coding':
        return (
          <div className="skeleton-loader" key={index}>
            <div className="skeleton-section">
              <div className="skeleton-title"></div>
              <div className="skeleton-content"></div>
              <div className="skeleton-content-medium"></div>
              
              <div style={{ display: 'flex', gap: '2%', marginTop: '20px' }}>
                <div style={{ flex: 1 }}>
                  <div className="skeleton-content" style={{ height: '20px', marginBottom: '10px' }}></div>
                  <div className="skeleton-content-medium" style={{ height: '20px', marginBottom: '10px' }}></div>
                  <div className="skeleton-content-short" style={{ height: '20px', marginBottom: '10px' }}></div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <div className="skeleton-option" style={{ height: '40px', flex: 1 }}></div>
                    <div className="skeleton-option" style={{ height: '40px', flex: 1 }}></div>
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div className="skeleton-editor"></div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <div className="skeleton-nav-btn"></div>
                <div className="skeleton-nav-btn"></div>
                <div className="skeleton-nav-btn"></div>
              </div>
            </div>
          </div>
        );
      
      case 'assessment':
      default:
        return (
          <div className="skeleton-loader" key={index}>
            <div className="skeleton-header">
              <div className="skeleton-timer"></div>
              <div className="skeleton-header-controls">
                <div className="skeleton-btn"></div>
                <div className="skeleton-btn"></div>
                <div className="skeleton-language-selector"></div>
                <div className="skeleton-btn"></div>
                <div className="skeleton-btn"></div>
              </div>
            </div>
            
            <div className="skeleton-section">
              <div className="skeleton-title"></div>
              <div className="skeleton-content"></div>
              <div className="skeleton-content-medium"></div>
              <div className="skeleton-content-short"></div>
              
              <div className="skeleton-options">
                <div className="skeleton-option"></div>
                <div className="skeleton-option"></div>
                <div className="skeleton-option"></div>
                <div className="skeleton-option"></div>
              </div>
              
              <div className="skeleton-progress"></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <div className="skeleton-nav-btn"></div>
                <div className="skeleton-nav-btn"></div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div>
      {Array.from({ length: count }, (_, index) => renderSkeleton(index))}
    </div>
  );
};

export default SkeletonLoader;