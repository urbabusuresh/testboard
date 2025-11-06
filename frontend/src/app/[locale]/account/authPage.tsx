'use client';
import { useState, useContext } from 'react';
import { Input, Button, Card, CardHeader, CardBody } from '@heroui/react';
import { BugIcon, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { signUp, signIn, signInAsGuest } from './authControl';
import { isValidEmail, isValidPassword } from './validate';
import { Link } from '@/src/i18n/routing';
import { UserType, AuthMessages } from '@/types/user';
import { roles } from '@/config/selection';
import { TokenContext } from '@/utils/TokenProvider';
import { useRouter } from '@/src/i18n/routing';
import Config from '@/config/config';
import { LocaleCodeType } from '@/types/locale';
import Footer from '@/components/Footer';

const isDemoSite = Config.isDemoSite;

type Props = {
  isSignup: boolean;
  messages: AuthMessages;
  locale: LocaleCodeType;
};

export default function AuthPage({ isSignup, messages, locale }: Props) {
  const router = useRouter();
  const context = useContext(TokenContext);
  const [user, setUser] = useState<UserType>({
    id: null,
    email: '',
    password: '',
    username: '',
    role: roles.findIndex((entry) => entry.uid === 'user'),
    avatarPath: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);

  const validate = async () => {
    if (!isValidEmail(user.email)) {
      setErrorMessage(messages.invalidEmail);
      return;
    }
    if (!isValidPassword(user.password)) {
      setErrorMessage(messages.invalidPassword);
      return;
    }
    if (isSignup) {
      if (!user.username) {
        setErrorMessage(messages.usernameEmpty);
        return;
      }
      if (user.password !== confirmPassword) {
        setErrorMessage(messages.passwordDoesNotMatch);
        return;
      }
    }
    await submit();
  };

  const submit = async () => {
    let token;
    if (isSignup) {
      try {
        token = await signUp(user);
      } catch {
        setErrorMessage(messages.signupError);
        return;
      }
    } else {
      try {
        token = await signIn(user);
      } catch {
        setErrorMessage(messages.signinError);
        return;
      }
    }
    context.setToken(token);
    context.storeTokenToLocalStorage(token);
    router.push('/account', { locale });
  };

  const handleSignInAsGuest = async () => {
    const token = await signInAsGuest();
    context.setToken(token);
    context.storeTokenToLocalStorage(token);
    router.push('/account', { locale });
  };

  return (
    <div className="min-h-screen w-full flex flex-col p-1 rounded md:flex-row">
      {/* LEFT SIDE: About Section */}
      <div className="md:w-1/2 flex flex-col justify-center items-center text-white p-10 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-200 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20  bg-[url('/favicon/automation.png')] bg-no-repeat bg-center bg-contain"></div>

        <div className="relative z-10 max-w-lg text-center md:text-left space-y-6">
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
  Design. Test. Validate. Visualize. Deliver.
</h1>

<p className="text-lg text-gray-800">
  Welcome to <span className="font-semibold text-gray-900">TestLab</span> — your unified platform for
  <span className="font-semibold"> manual </span> & 
  <span className="font-semibold"> automation testing</span> excellence.
</p>

<ul className="text-sm space-y-2 text-gray-700 mt-4">
  <li>🧩 Add and manage <strong>test cases</strong>, <strong>scenarios</strong>, and <strong>test runs</strong> independently </li>
  <li>⚙️ Leverage powerful <strong>schedulers</strong> to automate recurring test executions</li>
  <li>📊 Gain <strong>date-wise and user-wise metrics</strong> to track productivity and coverage</li>
  <li>📈 View <strong>real-time dashboards</strong> summarizing overall <strong>testcases & team </strong> progress</li>
  <li>🐞 Integrated <strong>bug tracking</strong> for efficient defect management</li>
  <li>🧠 Access detailed <strong>Allure reports</strong> with step-level <strong>screenshots</strong> for automation runs</li>
  
</ul>

<p className="text-sm text-gray-900 italic mt-4">
  “Building confidence through every test,turning every test into insight, and every insight into improvement.”
</p>

        </div>
      </div>

      {/* RIGHT SIDE: Auth Form */}
      <div className="md:w-1/2 flex flex-col justify-center items-center bg-slate-50 relative bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
        <div className="absolute inset-0 opacity-5  bg-[url('/favicon/testlab.png')] bg-no-repeat bg-center bg-contain"></div>

        <div className="w-[90%] max-w-md">
          
          <Card className="bg-white/70 backdrop-blur-lg shadow-2xl border border-slate-200">
            <CardHeader className="px-4 pt-4 pb-0 flex justify-between items-center">
              <h4 className="font-bold text-xl text-slate-800">{messages.title}</h4>
              <Button
                as={Link}
                href={isSignup ? '/account/signin' : '/account/signup'}
                locale={locale}
                color="primary"
                variant="flat"
                endContent={<ChevronRight size={16} />}
              >
                {messages.linkTitle}
              </Button>
            </CardHeader>

            <CardBody className="overflow-visible px-4 pt-2 pb-6">
              <form>
                {errorMessage && <div className="my-3 text-red-500 text-sm">{errorMessage}</div>}
                <Input
                  isRequired
                  type="email"
                  label={messages.email}
                  autoComplete="email"
                  className="mt-3"
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                />

                {isSignup && (
                  <Input
                    isRequired
                    type="username"
                    label={messages.username}
                    autoComplete="username"
                    className="mt-3"
                    onChange={(e) => setUser({ ...user, username: e.target.value })}
                  />
                )}

                <Input
                  label={messages.password}
                  variant="bordered"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  className="mt-3"
                  type={isPasswordVisible ? 'text' : 'password'}
                  endContent={
                    <button className="focus:outline-none" type="button" onClick={togglePasswordVisibility}>
                      {isPasswordVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  }
                  onChange={(e) => setUser({ ...user, password: e.target.value })}
                />

                {isSignup && (
                  <Input
                    label={messages.confirmPassword}
                    variant="bordered"
                    autoComplete="new-password"
                    className="mt-3"
                    type={isPasswordVisible ? 'text' : 'password'}
                    endContent={
                      <button className="focus:outline-none" type="button" onClick={togglePasswordVisibility}>
                        {isPasswordVisible ? <Eye size={20} /> : <EyeOff size={20} />}
                      </button>
                    }
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                )}

                {isDemoSite && (
                  <div className="my-3 text-gray-500 text-sm">{messages.demoPageWarning}</div>
                )}

                <div className="flex justify-end items-center mt-4">
                  <Button color="primary" onPress={validate}>
                    {messages.submitTitle}
                  </Button>
                  {!isSignup && isDemoSite && (
                    <Button
                      className="ms-3 bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg"
                      onPress={handleSignInAsGuest}
                    >
                      {messages.signInAsGuest}
                    </Button>
                  )}
                </div>
              </form>
            </CardBody>
          </Card>

          <div className="mt-4 text-center text-gray-400 text-xs">
            <Footer locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
