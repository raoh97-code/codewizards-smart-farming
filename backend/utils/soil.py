def soil_health(ph):
    if ph < 6:
        return "Soil is acidic"
    elif ph > 7.5:
        return "Soil is alkaline"
    else:
        return "Soil is healthy"