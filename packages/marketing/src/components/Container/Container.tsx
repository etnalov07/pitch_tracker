import styled from '@emotion/styled';
import { theme } from '../../styles/theme';

const Container = styled.div`
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 ${theme.spacing.lg};

    @media (min-width: ${theme.breakpoints.md}) {
        padding: 0 ${theme.spacing.xl};
    }
`;

export default Container;
