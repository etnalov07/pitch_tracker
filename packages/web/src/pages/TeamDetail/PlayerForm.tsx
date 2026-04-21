import React from 'react';
import { PitchType } from '../../types';
import {
    FormCard,
    FormTitle,
    Form,
    FormRow,
    FormGroup,
    Label,
    Input,
    Select,
    FormActions,
    CancelButton,
    SubmitButton,
    ErrorMessage,
    PitchTypesSection,
    PitchTypesLabel,
    PitchTypesGrid,
    PitchTypeCheckbox,
} from './styles';
import { TeamDetailState } from './useTeamDetail';

const PITCH_TYPES: { value: PitchType; label: string }[] = [
    { value: 'fastball', label: 'Fastball' },
    { value: '4-seam', label: '4-Seam' },
    { value: '2-seam', label: '2-Seam' },
    { value: 'cutter', label: 'Cutter' },
    { value: 'sinker', label: 'Sinker' },
    { value: 'slider', label: 'Slider' },
    { value: 'curveball', label: 'Curveball' },
    { value: 'changeup', label: 'Changeup' },
    { value: 'splitter', label: 'Splitter' },
    { value: 'knuckleball', label: 'Knuckle' },
];

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'UTIL'];

interface PlayerFormProps {
    state: TeamDetailState;
}

const PlayerForm: React.FC<PlayerFormProps> = ({ state }) => {
    const {
        editingPlayer,
        submitting,
        error,
        formData,
        selectedPitchTypes,
        handleChange,
        resetForm,
        handlePitchTypeToggle,
        handleSubmit,
    } = state;

    const isPitcher = formData.primary_position === 'P';

    return (
        <FormCard>
            <FormTitle>{editingPlayer ? 'Edit Player' : 'Add Player'}</FormTitle>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <Form onSubmit={handleSubmit}>
                <FormRow>
                    <FormGroup>
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input
                            type="text"
                            id="first_name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            placeholder="John"
                            autoFocus
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label htmlFor="last_name">Last Name *</Label>
                        <Input
                            type="text"
                            id="last_name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            placeholder="Doe"
                        />
                    </FormGroup>
                </FormRow>

                <FormRow>
                    <FormGroup>
                        <Label htmlFor="jersey_number">Jersey #</Label>
                        <Input
                            type="number"
                            id="jersey_number"
                            name="jersey_number"
                            value={formData.jersey_number}
                            onChange={handleChange}
                            placeholder="25"
                            min="0"
                            max="99"
                        />
                    </FormGroup>

                    <FormGroup>
                        <Label htmlFor="primary_position">Position</Label>
                        <Select
                            id="primary_position"
                            name="primary_position"
                            value={formData.primary_position}
                            onChange={handleChange}
                        >
                            {POSITIONS.map((pos) => (
                                <option key={pos} value={pos}>
                                    {pos}
                                </option>
                            ))}
                        </Select>
                    </FormGroup>
                </FormRow>

                <FormRow>
                    <FormGroup>
                        <Label htmlFor="bats">Bats</Label>
                        <Select id="bats" name="bats" value={formData.bats} onChange={handleChange}>
                            <option value="R">Right (R)</option>
                            <option value="L">Left (L)</option>
                            <option value="S">Switch (S)</option>
                        </Select>
                    </FormGroup>

                    {isPitcher && (
                        <FormGroup>
                            <Label htmlFor="throws">Throws</Label>
                            <Select id="throws" name="throws" value={formData.throws} onChange={handleChange}>
                                <option value="R">Right (RHP)</option>
                                <option value="L">Left (LHP)</option>
                            </Select>
                        </FormGroup>
                    )}
                </FormRow>

                {isPitcher && (
                    <PitchTypesSection>
                        <PitchTypesLabel>Pitch Types (select all that apply)</PitchTypesLabel>
                        <PitchTypesGrid>
                            {PITCH_TYPES.map(({ value, label }) => (
                                <PitchTypeCheckbox key={value} checked={selectedPitchTypes.includes(value)}>
                                    <input
                                        type="checkbox"
                                        checked={selectedPitchTypes.includes(value)}
                                        onChange={() => handlePitchTypeToggle(value)}
                                    />
                                    {label}
                                </PitchTypeCheckbox>
                            ))}
                        </PitchTypesGrid>
                    </PitchTypesSection>
                )}

                <FormActions>
                    <CancelButton type="button" onClick={resetForm}>
                        Cancel
                    </CancelButton>
                    <SubmitButton type="submit" disabled={submitting}>
                        {submitting ? 'Saving...' : editingPlayer ? 'Update Player' : 'Add Player'}
                    </SubmitButton>
                </FormActions>
            </Form>
        </FormCard>
    );
};

export default PlayerForm;
