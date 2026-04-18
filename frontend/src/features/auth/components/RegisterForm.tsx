import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@shared/components/ui/Button';
import { Input } from '@shared/components/ui/Input';
import { Card } from '@shared/components/ui/Card';
import { useRegister } from '../hooks/useAuth';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const register = useRegister();

  const { register: formRegister, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', phone: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register.mutateAsync(data);
      navigate('/login', { state: { message: 'Registration successful! Please sign in.' } });
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name" placeholder="John" error={errors.firstName?.message} {...formRegister('firstName')} />
          <Input label="Last Name" placeholder="Doe" error={errors.lastName?.message} {...formRegister('lastName')} />
        </div>
        <Input label="Email" type="email" placeholder="john@example.com" error={errors.email?.message} {...formRegister('email')} />
        <Input label="Phone" type="tel" placeholder="+971 50 123 4567" error={errors.phone?.message} {...formRegister('phone')} />
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 characters"
            error={errors.password?.message}
            rightIcon={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...formRegister('password')}
          />
        </div>
        <Button type="submit" fullWidth isLoading={isSubmitting || register.isPending}>
          Create Account
        </Button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </Card>
  );
}
