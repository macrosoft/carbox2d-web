# Правила проекта: HTML5 + Planck.js

## Физика (Planck.js)
- Мы используем `planck.js`, а не оригинальный `Box2D`.
- В Planck.js убран префикс `b2`. Используй `planck.World`, `planck.Body`, `planck.Vec2` вместо `b2World`, `b2Body`, `b2Vec2`.
- Методы используют `lowerCamelCase` (например, `world.createBody()`, а не `CreateBody()`).
- Объекты определений (BodyDef, FixtureDef) в Planck.js заменены на встроенные JS-объекты. 
  *ПРАВИЛЬНО:* `world.createBody({ type: 'dynamic', position: planck.Vec2(0, 0) })`
  *НЕПРАВИЛЬНО:* `let def = new planck.BodyDef();`
- Формы (Shapes) иммутабельны.

## Рендеринг
- Используем стандартный HTML5 Canvas API (или WebGL, если вы выбрали его) вместо OpenGL.