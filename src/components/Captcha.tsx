import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

interface CaptchaProps {
  onVerify: (isValid: boolean) => void;
  className?: string;
}

const Captcha: React.FC<CaptchaProps> = ({ onVerify, className = "" }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operator, setOperator] = useState<'+' | '-'>('+');
  const [userInput, setUserInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const generateCaptcha = useCallback(() => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    const op = Math.random() > 0.5 ? '+' : '-';
    
    // Ensure result is positive for subtraction
    if (op === '-' && n1 < n2) {
      setNum1(n2);
      setNum2(n1);
    } else {
      setNum1(n1);
      setNum2(n2);
    }
    setOperator(op as '+' | '-');
    setUserInput('');
    setIsVerified(false);
    onVerify(false);
  }, [onVerify]);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const checkCaptcha = (value: string) => {
    setUserInput(value);
    const result = operator === '+' ? num1 + num2 : num1 - num2;
    const isValid = parseInt(value) === result;
    setIsVerified(isValid);
    onVerify(isValid);
  };

  const defaultStyles = "bg-gray-50 border-gray-200";
  const containerStyles = className.includes('bg-') ? className : `${defaultStyles} ${className}`;

  return (
    <div className={`p-4 rounded-2xl border ${containerStyles}`}>
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          Security Verification
        </label>
        <button 
          type="button"
          onClick={generateCaptcha}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
          title="Refresh Captcha"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 bg-white px-4 py-2 rounded-xl border border-gray-200 font-mono font-bold text-lg shadow-sm select-none text-black">
          {num1} {operator} {num2} = ?
        </div>
        <input
          type="number"
          value={userInput}
          onChange={(e) => checkCaptcha(e.target.value)}
          placeholder="Answer"
          className={`flex-grow px-4 py-2 rounded-xl border outline-none transition-all font-bold text-black ${
            isVerified ? 'border-green-500 bg-green-50 !text-green-700' : 'border-gray-200 focus:border-black'
          }`}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-2 italic">
        * Please solve this simple math problem to prove you are human.
      </p>
    </div>
  );
};

export default Captcha;
