data "aws_sns_topic" "rc_alarms" {
  name = "research-catalog-team-alarms-production"
}

# Warn-level "RedirectFailure" log entries emitted from index.js's catch-all handler 
# (individual requests fall back gracefully, but a spike here indicates a bigger problem)

resource "aws_cloudwatch_log_metric_filter" "redirect_failure" {
  name           = "RedirectFailure"
  log_group_name = "/aws/lambda/Redirect-production"
  pattern        = "{ $.metric = \"RedirectFailure\" }"

  metric_transformation {
    name      = "RedirectFailure"
    namespace = "Redirect-production"
    value     = "1"
    unit      = "Count"
  }
}

resource "aws_cloudwatch_metric_alarm" "redirect_failure_rate" {
  alarm_name          = "RedirectFailureRateAlarm"
  alarm_description   = "Triggers when RedirectFailure count reaches 20 within 1 minute, indicating a broader issue rather than isolated bad requests."
  namespace           = aws_cloudwatch_log_metric_filter.redirect_failure.metric_transformation[0].namespace
  metric_name         = aws_cloudwatch_log_metric_filter.redirect_failure.metric_transformation[0].name
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 20
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [data.aws_sns_topic.rc_alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "RedirectLambdaErrorAlarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Redirect Lambda has invocation errors"
  alarm_actions       = [data.aws_sns_topic.rc_alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = "Redirect-production"
  }
}
