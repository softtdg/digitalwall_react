import React, { createContext, useContext, useState } from 'react';

const PaginationContext = createContext();

export const usePagination = () => {
  const context = useContext(PaginationContext);
  if (!context) {
    return null;
  }
  return context;
};

export const PaginationProvider = ({ children }) => {
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    totalRecords: 0,
    totalPages: 0,
  });
  const [handlePageChange, setHandlePageChange] = useState(null);
  const [handleLimitChange, setHandleLimitChange] = useState(null);

  return (
    <PaginationContext.Provider value={{ pagination, setPagination, handlePageChange, setHandlePageChange, handleLimitChange, setHandleLimitChange }}>
      {children}
    </PaginationContext.Provider>
  );
};

