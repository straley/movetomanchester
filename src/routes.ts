import Home from './routes/Home.svelte';
import Crime from './routes/Crime.svelte';
import NotFound from './routes/NotFound.svelte';

const routes = {
    // Exact path
    '/': Home,

    // Wildcard parameter
    '/crime': Crime,

    // Catch-all
    // This is optional, but if present it must be the last
    '*': NotFound,
}

export default routes