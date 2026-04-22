import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    isValid?: boolean;
    isRequired?: boolean;
    showStrength?: boolean;
    icon?: React.ElementType;
    rightElement?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = ({
    label,
    error,
    isValid,
    isRequired,
    showStrength,
    icon: Icon,
    rightElement,
    type,
    className = '',
    onBlur,
    onChange,
    value,
    ...props
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const [strength, setStrength] = useState<{ score: number; label: string; color: string }>({ score: 0, label: '', color: 'bg-slate-200' });
    const [touched, setTouched] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    useEffect(() => {
        if (showStrength && isPassword && value) {
            const val = value.toString();
            let score = 0;
            if (val.length > 8) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            const mapping = [
                { label: 'Weak', color: 'bg-rose-400' },
                { label: 'Fair', color: 'bg-amber-400' },
                { label: 'Good', color: 'bg-emerald-400' },
                { label: 'Strong', color: 'bg-emerald-600' }
            ];

            setStrength({ score, ...mapping[Math.max(0, score - 1)] });
        } else {
            setStrength({ score: 0, label: '', color: 'bg-slate-200' });
        }
    }, [value, showStrength, isPassword]);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setTouched(true);
        if (onBlur) onBlur(e);
    };

    return (
        <div className={`w-full space-y-2 ${className}`}>
            <label className="flex items-center text-[10px] font-black uppercase tracking-[0.15em] text-[#041C3C]/60 ml-2">
                {label}
                {isRequired && <span className="text-rose-500 ml-1">*</span>}
            </label>
            
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-identity-sky transition-colors">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    type={inputType}
                    value={value}
                    onBlur={handleBlur}
                    onChange={onChange}
                    className={`w-full ${Icon ? 'pl-14' : 'px-5'} py-4 rounded-xl bg-white border border-slate-200 transition-all outline-none text-[#041C3C] font-bold text-sm
                        ${touched && error ? 'border-rose-400 focus:ring-rose-400' : touched && isValid ? 'border-emerald-400 focus:ring-emerald-400' : 'border-slate-200 group-hover:border-[#5CB4E4]/30 focus:border-[#5CB4E4] focus:ring-2 focus:ring-[#5CB4E4]/20'}
                    `}
                    {...props}
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {rightElement}
                    {isPassword && !rightElement && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-400 hover:text-identity-navy transition-colors p-1"
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    )}
                    {touched && isValid && !error && <CheckCircle2 size={18} className="text-emerald-500" />}
                    {touched && error && <AlertCircle size={18} className="text-rose-500" />}
                </div>
            </div>

            {showStrength && isPassword && value && (
                <div className="mt-2 space-y-1 px-2">
                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.15em]">
                        <span className="text-slate-400">Security Strength</span>
                        <span style={{ color: strength.color.replace('bg-', 'var(--') }}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className={`h-full flex-1 transition-all duration-500 ${i <= strength.score ? strength.color : 'bg-slate-200'}`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {touched && error && (
                <p className="text-[9px] font-bold text-rose-500 uppercase tracking-[0.15em] px-2 animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </div>
    );
};

export default InputField;
