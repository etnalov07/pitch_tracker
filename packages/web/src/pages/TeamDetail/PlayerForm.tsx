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

    return (
        <FormCard>
            <FormTitle>{editingPlayer ? 'Edit Pitcher' : 'Add Pitcher'}</FormTitle>
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
                        <Label htmlFor="throws">Pitcher Type</Label>
                        <Select id="throws" name="throws" value={formData.throws} onChange={handleChange}>
                            <option value="R">RHP (Right)</option>
                            <option value="L">LHP (Left)</option>
                        </Select>
                    </FormGroup>
                </FormRow>

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

                <FormActions>
                    <CancelButton type="button" onClick={resetForm}>
                        Cancel
                    </CancelButton>
                    <SubmitButton type="submit" disabled={submitting}>
                        {submitting ? 'Saving...' : editingPlayer ? 'Update Pitcher' : 'Add Pitcher'}
                    </SubmitButton>
                </FormActions>
            </Form>
        </FormCard>
    );
};

export default PlayerForm;
