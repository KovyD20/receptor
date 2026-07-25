function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    return next();
  };
}

module.exports = { validate };
