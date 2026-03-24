import { createComponent } from 'liteforge';
import { RouterOutlet } from '@liteforge/router';

export const App = createComponent({
  name: 'App',
  component() {
    return <div id="docs-root">{RouterOutlet()}</div>;
  },
});
