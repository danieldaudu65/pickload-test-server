router.post('/delivery_price', async (req, res) => {
    //requesting for fields
    const { token, pickup_location, drop_off_location, distance, delivery_medium, delivery_duration } = req.body


    //fields verification
    if (!token || !pickup_location || !drop_off_location || !distance || !delivery_medium || !delivery_duration) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be filled' })
    }

    try {

        //jwt verification
        let user = jwt.verify(token, process.env.JWT_SECRET);

        // get rates from statistics
        const stats = await Statistics.findOne({ doc_type: 'admin' }).lean();

        // Base fares
        let bfTruck = stats.base_fare.truck;
        let bfVan = stats.base_fare.van;
        let bfCar = stats.base_fare.car;
        let bfBike = stats.base_fare.bike;

        // Kilometer rates
        let kmTruck = stats.km_rate.truck;
        let kmVan = stats.km_rate.van;
        let kmCar = stats.km_rate.car;
        let kmBike = stats.km_rate.bike;

        // Time rates
        let timeTruck = stats.time_rate.truck;
        let timeVan = stats.time_rate.van;
        let timeCar = stats.time_rate.car;
        let timeBike = stats.time_rate.bike;

        // Min prices
        let minTruck = stats.min_price.truck;
        let minVan = stats.min_price.van;
        let minCar = stats.min_price.car;
        let minBike = stats.min_price.bike;

        //dummy rate
        let price;

        //getting prices for each delivery medium        
        if (delivery_medium == 'truck') {
            price = bfTruck + (kmTruck * distance) + (timeTruck * delivery_duration);
            if (price < minTruck) {
                price = minTruck;
            }
        }

        if (delivery_medium == 'van') {
            price = bfVan + (kmVan * distance) + (timeVan * delivery_duration);
            if (price < minVan) {
                price = minVan;
            }
        }

        if (delivery_medium == 'car') {
            price = bfCar + (kmCar * distance) + (timeCar * delivery_duration);
            if (price < minCar) {
                price = minCar;
            }
        }

        if (delivery_medium == 'bike') {
            price = bfBike + (kmBike * distance) + (timeBike * delivery_duration);
            if (price < minBike) {
                price = minBike;
            }
        }

        // round off price to the nearest hundred


        return res.status(200).send({ status: 'ok', msg: 'Success', price: roundUpToNearest100(price) });

    } catch (e) {
        console.log(e);
        return res.status(400).send({ status: 'error', msg: 'some error occured' })
    }

});
