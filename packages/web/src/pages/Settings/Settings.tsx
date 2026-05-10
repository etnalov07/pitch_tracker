import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeMode, type ThemeMode } from '../../contexts';
import {
    BackButton,
    ChoiceButton,
    ChoiceGroup,
    ChoiceIcon,
    ChoiceLabel,
    Container,
    Header,
    HeaderLeft,
    MainContent,
    Section,
    SectionDescription,
    SectionTitle,
    Title,
} from './styles';

const THEME_CHOICES: { value: ThemeMode; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: '☀' },
    { value: 'dark', label: 'Dark', icon: '☾' },
    { value: 'system', label: 'System', icon: '⚙' },
];

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { mode, setMode } = useThemeMode();

    return (
        <Container>
            <Header>
                <HeaderLeft>
                    <Title>Settings</Title>
                </HeaderLeft>
                <BackButton onClick={() => navigate('/')}>Back to Dashboard</BackButton>
            </Header>

            <MainContent>
                <Section>
                    <SectionTitle>Appearance</SectionTitle>
                    <SectionDescription>
                        Choose how PitchChart looks. &quot;System&quot; matches your device&apos;s setting.
                    </SectionDescription>
                    <ChoiceGroup>
                        {THEME_CHOICES.map((choice) => (
                            <ChoiceButton
                                key={choice.value}
                                active={mode === choice.value}
                                onClick={() => setMode(choice.value)}
                                aria-pressed={mode === choice.value}
                            >
                                <ChoiceIcon aria-hidden="true">{choice.icon}</ChoiceIcon>
                                <ChoiceLabel>{choice.label}</ChoiceLabel>
                            </ChoiceButton>
                        ))}
                    </ChoiceGroup>
                </Section>
            </MainContent>
        </Container>
    );
};

export default Settings;
