import React from 'react';

const ErrorRow = ({ error }) => error && <div className="err-row">{error}</div>;

export default ErrorRow;
