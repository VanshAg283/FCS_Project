import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const VirtualKeyboard = ({ onChange, maxLength = 6 }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    onChange(inputValue); // Notify parent component of changes
  }, [inputValue, onChange]);

  const handleKeyPress = (key) => {
    setInputValue((prev) => {
      if (prev.length < maxLength) {
        return prev + key;
      }
      return prev;
    });
  };

  const handleBackspace = () => {
    setInputValue((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setInputValue('');
  };

  const renderDisplay = () => {
    const displayChars = Array(maxLength).fill('•'); // Use a placeholder character
    for (let i = 0; i < inputValue.length; i++) {
      displayChars[i] = '*'; // Use '*' for entered digits
    }
    return displayChars.join('');
  };

  const numberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-gray-50 shadow-inner">
      {/* Display Area */}
      <div className="w-full mb-4 p-2 text-center text-2xl font-mono tracking-widest border rounded bg-white h-12 flex items-center justify-center">
        {renderDisplay()}
      </div>

      {/* Keyboard Grid */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {numberKeys.map((key) => (
          <button
            key={key}
            onClick={() => handleKeyPress(key)}
            className={`py-3 px-4 rounded text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-150 ease-in-out ${
              inputValue.length >= maxLength
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 shadow-sm'
            }`}
            disabled={inputValue.length >= maxLength}
          >
            {key}
          </button>
        ))}
        {/* Placeholder or align 0 */}
        {/* <div /> */}
        <button
            key="backspace"
            onClick={handleBackspace}
            className={`col-span-1 py-3 px-4 rounded text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-150 ease-in-out ${
              inputValue.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 shadow-sm'
            }`}
            disabled={inputValue.length === 0}
        >
             &larr; {/* Left Arrow for Backspace */}
        </button>
        <button
          key="clear"
          onClick={handleClear}
          className={`col-span-1 py-3 px-4 rounded text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-150 ease-in-out ${
            inputValue.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 shadow-sm'
          }`}
          disabled={inputValue.length === 0}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

VirtualKeyboard.propTypes = {
  onChange: PropTypes.func.isRequired,
  maxLength: PropTypes.number,
};

export default VirtualKeyboard;
