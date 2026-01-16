import React, { useState, useEffect } from 'react';
import { Form, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, loginUser, registerUser, clearAuthError } from '../../state';
import {
    Container,
    ErrorMessage,
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
} from './styles';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { loading, error, isAuthenticated } = useAppSelector((state) => state.auth);

    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: '',
        first_name: '',
        last_name: '',
    });

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
                    username: formData.username,
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                })
            );
        }
    };

    return (
        <Container>
            <FormCard>
                <Logo>⚾ Baseball Tracker</Logo>
                <Title>{isLogin ? 'Welcome Back' : 'Create Account'}</Title>
                <Subtitle>{isLogin ? 'Sign in to track your games' : 'Sign up to get started'}</Subtitle>

                {error && <ErrorMessage>{error}</ErrorMessage>}

                <Form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <FormGroup>
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required={!isLogin}
                                    placeholder="johndoe"
                                />
                            </FormGroup>

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
