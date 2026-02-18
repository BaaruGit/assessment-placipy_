import React from 'react';
import './SkeletonLoader.css';

interface SkeletonLoaderProps {
  type?: 'admin-dashboard' | 'admin-stats' | 'admin-table' | 'admin-card' | 'admin-form';
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type = 'admin-dashboard', count = 1 }) => {
  const renderSkeleton = (index: number) => {
    switch (type) {
      case 'admin-stats':
        return (
          <div className="admin-skeleton-card" key={index}>
            <div className="admin-skeleton-line" style={{ width: '60%', height: '20px', marginBottom: '12px' }}></div>
            <div className="admin-skeleton-line" style={{ width: '40%', height: '30px' }}></div>
          </div>
        );
      
      case 'admin-table':
        return (
          <div className="admin-skeleton-table-row" key={index}>
            <div className="admin-skeleton-cell" style={{ width: '25%' }}>
              <div className="admin-skeleton-line" style={{ width: '80%', height: '16px' }}></div>
            </div>
            <div className="admin-skeleton-cell" style={{ width: '25%' }}>
              <div className="admin-skeleton-line" style={{ width: '70%', height: '16px' }}></div>
            </div>
            <div className="admin-skeleton-cell" style={{ width: '25%' }}>
              <div className="admin-skeleton-line" style={{ width: '60%', height: '16px' }}></div>
            </div>
            <div className="admin-skeleton-cell" style={{ width: '25%' }}>
              <div className="admin-skeleton-line" style={{ width: '50%', height: '16px' }}></div>
            </div>
          </div>
        );
      
      case 'admin-card':
        return (
          <div className="admin-skeleton-card" key={index}>
            <div className="admin-skeleton-line" style={{ width: '100%', height: '24px', marginBottom: '16px' }}></div>
            <div className="admin-skeleton-line" style={{ width: '80%', height: '16px', marginBottom: '12px' }}></div>
            <div className="admin-skeleton-line" style={{ width: '60%', height: '16px', marginBottom: '12px' }}></div>
            <div className="admin-skeleton-line" style={{ width: '40%', height: '16px', marginBottom: '16px' }}></div>
          </div>
        );
      
      case 'admin-form':
        return (
          <div className="admin-skeleton-form-field" key={index}>
            <div className="admin-skeleton-line" style={{ width: '30%', height: '16px', marginBottom: '8px' }}></div>
            <div className="admin-skeleton-line" style={{ width: '100%', height: '40px' }}></div>
          </div>
        );
      
      case 'admin-dashboard':
      default:
        return (
          <div className="admin-skeleton-dashboard" key={index}>
            <div className="admin-skeleton-header">
              <div className="admin-skeleton-line" style={{ width: '40%', height: '28px', marginBottom: '16px' }}></div>
              <div className="admin-skeleton-line" style={{ width: '60%', height: '20px', marginBottom: '8px' }}></div>
              <div className="admin-skeleton-line" style={{ width: '50%', height: '18px' }}></div>
            </div>
            
            <div className="admin-skeleton-stats-container">
              {[...Array(4)].map((_, idx) => (
                <div className="admin-skeleton-card" key={idx}>
                  <div className="admin-skeleton-line" style={{ width: '60%', height: '20px', marginBottom: '12px' }}></div>
                  <div className="admin-skeleton-line" style={{ width: '40%', height: '30px' }}></div>
                </div>
              ))}
            </div>
            
            <div className="admin-skeleton-table">
              <div className="admin-skeleton-table-header">
                <div className="admin-skeleton-line" style={{ width: '100%', height: '24px' }}></div>
              </div>
              
              {[...Array(5)].map((_, idx) => (
                <div className="admin-skeleton-table-row" key={idx}>
                  <div className="admin-skeleton-cell" style={{ width: '25%' }}>
                    <div className="admin-skeleton-line" style={{ width: '80%', height: '16px' }}></div>
                  </div>
                  <div className="admin-skeleton-cell" style={{ width: '25%' }}>
                    <div className="admin-skeleton-line" style={{ width: '70%', height: '16px' }}></div>
                  </div>
                  <div className="admin-skeleton-cell" style={{ width: '25%' }}>
                    <div className="admin-skeleton-line" style={{ width: '60%', height: '16px' }}></div>
                  </div>
                  <div className="admin-skeleton-cell" style={{ width: '25%' }}>
                    <div className="admin-skeleton-line" style={{ width: '50%', height: '16px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return <div className="admin-skeleton-wrapper">{Array.from({ length: count }, (_, index) => renderSkeleton(index))}</div>;
};

// Main skeleton wrapper component for admin
interface AdminSkeletonWrapperProps {
  children?: React.ReactNode;
  loading: boolean;
  type?: 'admin-dashboard' | 'admin-stats' | 'admin-table' | 'admin-card' | 'admin-form';
  count?: number;
}

const AdminSkeletonWrapper: React.FC<AdminSkeletonWrapperProps> = ({ 
  children, 
  loading, 
  type = 'admin-dashboard', 
  count = 1 
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'admin-stats':
        return Array.from({ length: count }).map((_, index) => (
          <div className="admin-skeleton-card" key={`stats-${index}`}>
            <div className="admin-skeleton-line" style={{ width: '60%', height: '20px', marginBottom: '12px' }}></div>
            <div className="admin-skeleton-line" style={{ width: '40%', height: '30px' }}></div>
          </div>
        ));
      case 'admin-table':
        return Array.from({ length: count }).map((_, index) => (
          <div className="admin-skeleton-table-container" key={`table-${index}`}>
            {[...Array(5)].map((_, idx) => (
              <div className="admin-skeleton-table-row" key={idx}>
                <div className="admin-skeleton-cell" style={{ width: '25%' }}>
                  <div className="admin-skeleton-line" style={{ width: '80%', height: '16px' }}></div>
                </div>
                <div className="admin-skeleton-cell" style={{ width: '25%' }}>
                  <div className="admin-skeleton-line" style={{ width: '70%', height: '16px' }}></div>
                </div>
                <div className="admin-skeleton-cell" style={{ width: '25%' }}>
                  <div className="admin-skeleton-line" style={{ width: '60%', height: '16px' }}></div>
                </div>
                <div className="admin-skeleton-cell" style={{ width: '25%' }}>
                  <div className="admin-skeleton-line" style={{ width: '50%', height: '16px' }}></div>
                </div>
              </div>
            ))}
          </div>
        ));
      case 'admin-card':
        return Array.from({ length: count }).map((_, index) => (
          <div className="admin-skeleton-card" key={`card-${index}`}>
            <div className="admin-skeleton-line" style={{ width: '100%', height: '24px', marginBottom: '16px' }}></div>
            <div className="admin-skeleton-line" style={{ width: '80%', height: '16px', marginBottom: '12px' }}></div>
            <div className="admin-skeleton-line" style={{ width: '60%', height: '16px', marginBottom: '12px' }}></div>
            <div className="admin-skeleton-line" style={{ width: '40%', height: '16px', marginBottom: '16px' }}></div>
          </div>
        ));
      case 'admin-form':
        return Array.from({ length: count }).map((_, index) => (
          <div className="admin-skeleton-form-field" key={`form-${index}`}>
            <div className="admin-skeleton-line" style={{ width: '30%', height: '16px', marginBottom: '8px' }}></div>
            <div className="admin-skeleton-line" style={{ width: '100%', height: '40px' }}></div>
          </div>
        ));
      default:
        return <SkeletonLoader type={type} count={count} />;
    }
  };

  return (
    <div>
      {loading ? renderSkeleton() : children}
    </div>
  );
};

export { SkeletonLoader, AdminSkeletonWrapper };