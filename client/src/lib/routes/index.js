import AuthRoutes from './AuthRoutes';
import PrivateRoutes from './PrivateRoutes';
import PublicRoutes from './PublicRoutes';

//Gets all application routes.
export const getAllRoutes = () => {
  return [
    ...AuthRoutes(),
    ...PrivateRoutes(),
    ...PublicRoutes()
  ];
};

export {
  AuthRoutes,
  PrivateRoutes,
  PublicRoutes
}; 