import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAppDispatch, useAppSelector, loginUser, registerUser, clearAuthError } from '../../state';
import {
    Container,
    ErrorMessage,
    Form,
    FormCard,
    FormGroup,
    FormRow,
    Input,
    Label,
    Logo,
    SubmitButton,
    Subtitle,
    Title,
    ToggleLink,
    ToggleText,
    RoleSelector,
    RoleOption,
} from './styles';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);

    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        registration_type: 'coach' as 'coach' | 'player' | 'org_admin',
    });

    const [forgot, setForgot] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotBusy, setForgotBusy] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        if (error) {
            dispatch(clearAuthError());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLogin) {
            dispatch(
                loginUser({
                    email: formData.email,
                    password: formData.password,
                })
            );
        } else {
            dispatch(
                registerUser({
                    email: formData.email,
                    password: formData.password,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    registration_type: formData.registration_type,
                })
            );
        }
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail.trim() || forgotBusy) return;
        setForgotBusy(true);
        try {
            await authService.requestPasswordReset(forgotEmail.trim());
        } catch {
            // Endpoint always succeeds (anti-enumeration) — nothing to surface.
        }
        setForgotBusy(false);
        setForgotSent(true);
    };

    const leaveForgot = () => {
        setForgot(false);
        setForgotSent(false);
        setForgotEmail('');
    };

    if (forgot) {
        return (
            <Container>
                <FormCard>
                    <Logo>PitchChart</Logo>
                    <Title>Reset your password</Title>
                    <Subtitle>We&apos;ll email you a link to set a new one</Subtitle>
                    {forgotSent ? (
                        <>
                            <p style={{ color: '#15803d', lineHeight: 1.5 }}>
                                If that address has an account, a reset link is on its way. The link expires in 1 hour.
                            </p>
                            <ToggleText>
                                <ToggleLink onClick={leaveForgot}>Back to sign in</ToggleLink>
                            </ToggleText>
                        </>
                    ) : (
                        <>
                            <Form onSubmit={handleForgotSubmit}>
                                <FormGroup>
                                    <Label htmlFor="forgot_email">Email</Label>
                                    <Input
                                        type="email"
                                        id="forgot_email"
                                        name="forgot_email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        required
                                        placeholder="john@example.com"
                                    />
                                </FormGroup>
                                <SubmitButton type="submit" disabled={forgotBusy}>
                                    {forgotBusy ? 'Please wait...' : 'Send reset link'}
                                </SubmitButton>
                            </Form>
                            <ToggleText>
                                <ToggleLink onClick={leaveForgot}>Back to sign in</ToggleLink>
                            </ToggleText>
                        </>
                    )}
                </FormCard>
            </Container>
        );
    }

    return (
        <Container>
            <FormCard>
                <Logo>PitchChart</Logo>
                <Title>{isLogin ? 'Welcome Back' : 'Create Account'}</Title>
                <Subtitle>{isLogin ? 'Sign in to track your games' : 'Sign up to get started'}</Subtitle>

                {error && <ErrorMessage>{error}</ErrorMessage>}

                <Form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <FormRow>
                                <FormGroup>
                                    <Label htmlFor="first_name">First Name</Label>
                                    <Input
                                        type="text"
                                        id="first_name"
                                        name="first_name"
                                        value={formData.first_name}
                                        onChange={handleChange}
                                        required={!isLogin}
                                        placeholder="John"
                                    />
                                </FormGroup>

                                <FormGroup>
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <Input
                                        type="text"
                                        id="last_name"
                                        name="last_name"
                                        value={formData.last_name}
                                        onChange={handleChange}
                                        required={!isLogin}
                                        placeholder="Doe"
                                    />
                                </FormGroup>
                            </FormRow>

                            <FormGroup>
                                <Label>I am a...</Label>
                                <RoleSelector>
                                    <RoleOption
                                        active={formData.registration_type === 'coach'}
                                        onClick={() => setFormData({ ...formData, registration_type: 'coach' })}
                                    >
                                        Coach
                                    </RoleOption>
                                    <RoleOption
                                        active={formData.registration_type === 'player'}
                                        onClick={() => setFormData({ ...formData, registration_type: 'player' })}
                                    >
                                        Player
                                    </RoleOption>
                                    <RoleOption
                                        active={formData.registration_type === 'org_admin'}
                                        onClick={() => setFormData({ ...formData, registration_type: 'org_admin' })}
                                    >
                                        Org Admin
                                    </RoleOption>
                                </RoleSelector>
                            </FormGroup>
                        </>
                    )}

                    <FormGroup>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="john@example.com"
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label htmlFor="password">Password</Label>
                        <Input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="••••••••"
                        />
                    </FormGroup>

                    {isLogin && (
                        <ToggleText style={{ textAlign: 'right', marginTop: 0 }}>
                            <ToggleLink onClick={() => setForgot(true)}>Forgot password?</ToggleLink>
                        </ToggleText>
                    )}

                    <SubmitButton type="submit" disabled={loading}>
                        {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
                    </SubmitButton>
                </Form>

                <ToggleText>
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <ToggleLink onClick={() => setIsLogin(!isLogin)}>{isLogin ? 'Sign up' : 'Sign in'}</ToggleLink>
                </ToggleText>
            </FormCard>
        </Container>
    );
};

export default Login;
