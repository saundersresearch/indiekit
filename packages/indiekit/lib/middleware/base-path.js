/**
 * Make an app served under a sub-path (i.e. https://example.com/indiekit)
 * emit links that stay under it. Plug-ins and templates use root-relative
 * paths such as `/posts`, which would otherwise escape the sub-path.
 * @param {string} basePath - Base path, i.e. `/indiekit`, or empty string
 * @returns {RequestHandler} Express middleware
 */
export const basePath = (basePath) => (request, response, next) => {
  if (!basePath) {
    return next();
  }

  /**
   * @param {string} path - Path or URL
   * @returns {string} Path prefixed with base path if root-relative
   */
  const prefix = (path) =>
    path !== basePath &&
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.startsWith(`${basePath}/`) &&
    !path.startsWith(`${basePath}?`)
      ? basePath + path
      : path;

  const { redirect, render } = response;

  response.redirect = (...arguments_) => {
    const index = typeof arguments_[0] === "number" ? 1 : 0;
    arguments_[index] = prefix(arguments_[index]);
    return redirect.apply(response, arguments_);
  };

  response.render = (view, options, callback) => {
    if (typeof options === "function") {
      callback = options;
      options = undefined;
    }

    return render.call(response, view, options, (error, html) => {
      if (error) {
        return callback ? callback(error) : request.next(error);
      }

      html = html.replaceAll(
        /(\s(?:href|src|action)=")(\/[^"]*)"/g,
        (_match, attribute, path) => `${attribute}${prefix(path)}"`,
      );

      return callback ? callback(undefined, html) : response.send(html);
    });
  };

  next();
};

/**
 * @import { RequestHandler } from "express"
 */
